import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/team/admin-update-member", async (req, res) => {
    try {
      const { memberId, updates, email } = req.body;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({
          error:
            "Missing SUPABASE_SERVICE_ROLE_KEY. الرجاء إضافة المفتاح في إعدادات البيئة (Environment Variables) لتمكين هذه الخاصية.",
        });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { password, ...memberUpdates } = updates;

      if (password) {
        // Handle password update first
        const { data: memberData, error: memberError } = await supabaseAdmin
          .from("team_members")
          .select("auth_user_id, email")
          .eq("id", memberId)
          .single();

        if (memberError || !memberData) {
          return res
            .status(404)
            .json({ error: "العضو غير موجود في قاعدة البيانات." });
        }

        let authUserId = memberData.auth_user_id;

        if (!authUserId) {
          const targetEmail = memberData.email || email;
          const { data: usersData, error: listError } =
            await supabaseAdmin.auth.admin.listUsers();

          if (listError)
            return res
              .status(500)
              .json({ error: "فشل في قراءة قائمة مستخدمي النظام." });

          const existingUser = usersData.users.find(
            (u: any) => u.email?.toLowerCase() === targetEmail?.toLowerCase(),
          );

          if (existingUser) {
            authUserId = existingUser.id;
            await supabaseAdmin
              .from("team_members")
              .update({ auth_user_id: authUserId })
              .eq("id", memberId);
          } else {
            // Create the user as they don't exist yet!
            const { data: newUser, error: createError } =
              await supabaseAdmin.auth.admin.createUser({
                email: targetEmail,
                password,
                email_confirm: true,
              });
            if (createError) {
              return res.status(500).json({
                error: "تعذر إنشاء حساب تسجيل الدخول: " + createError.message,
              });
            }
            authUserId = newUser.user.id;
            await supabaseAdmin
              .from("team_members")
              .update({ auth_user_id: authUserId })
              .eq("id", memberId);
          }
        }

        // Only update password if we didn't just create the user with the password
        if (authUserId) {
          const { error: passwordUpdateError } =
            await supabaseAdmin.auth.admin.updateUserById(authUserId, {
              password,
              email_confirm: true,
            });

          if (passwordUpdateError) {
            if (passwordUpdateError.message.includes("User not found")) {
              const targetEmail = memberData.email || email;
              const { data: newUser, error: createError } =
                await supabaseAdmin.auth.admin.createUser({
                  email: targetEmail,
                  password,
                  email_confirm: true,
                });
              if (createError) {
                return res.status(500).json({
                  error: "تعذر إنشاء حساب تسجيل الدخول: " + createError.message,
                });
              }
              await supabaseAdmin
                .from("team_members")
                .update({ auth_user_id: newUser.user.id })
                .eq("id", memberId);
            } else {
              return res.status(500).json({ error: passwordUpdateError.message });
            }
          }
        }
      }

      // Convert updates to snake_case equivalent
      if (Object.keys(memberUpdates).length > 0) {
        const payload = Object.fromEntries(
          Object.entries(memberUpdates).map(([key, value]) => {
            // Extremely simple camel to snake case
            const snake = key.replace(
              /[A-Z]/g,
              (letter) => `_${letter.toLowerCase()}`,
            );
            return [snake, value];
          }),
        );
        const { error: dbUpdateError } = await supabaseAdmin
          .from("team_members")
          .update(payload)
          .eq("id", memberId);

        if (dbUpdateError) {
          return res.status(500).json({ error: dbUpdateError.message });
        }
      }

      res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Admin user update error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/team/admin-create-member", async (req, res) => {
    try {
      const { memberData } = req.body;
      const { email, password, ...restOfData } = memberData;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({
          error: "Missing SUPABASE_SERVICE_ROLE_KEY.",
        });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      // Create user
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (createError) {
        let errorMsg = "تعذر إنشاء حساب تسجيل الدخول: " + createError.message;
        if (createError.message.includes("already registered") || createError.message.includes("already exists")) {
          errorMsg = "البريد الإلكتروني مسجل بالفعل لموظف آخر.";
        }
        return res.status(500).json({
          error: errorMsg,
        });
      }

      const authUserId = newUser.user.id;

      // Insert into team_members
      const payload = Object.fromEntries(
        Object.entries({ ...restOfData, email, authUserId }).map(
          ([key, value]) => {
            const snake = key.replace(
              /[A-Z]/g,
              (letter) => `_${letter.toLowerCase()}`,
            );
            return [snake, value];
          },
        ),
      );

      const { data: insertedMember, error: dbInsertError } = await supabaseAdmin
        .from("team_members")
        .insert(payload)
        .select()
        .single();

      if (dbInsertError) {
        // Cleanup auth user if team_member insert fails
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        let errorMsg = "تعذر إضافة العضو للقاعدة: " + dbInsertError.message;
        if (dbInsertError.code === "23505" && dbInsertError.message.includes("team_members_email_key")) {
          errorMsg = "البريد الإلكتروني مسجل بالفعل لموظف آخر.";
        }
        return res.status(500).json({
          error: errorMsg,
        });
      }

      res.status(200).json({ success: true, member: insertedMember });
    } catch (err: any) {
      console.error("Admin user create error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/admin/run-sql", async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const { data, error } = await supabaseAdmin.from('projects').select('id, name, members');
      if (error) {
         return res.status(500).json({ error });
      }

      res.status(200).json({ success: true, count: data.length, data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/tasks", async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const { data, error } = await supabaseAdmin.from('tasks').select('*');
      if (error) {
         return res.status(500).json({ error });
      }

      res.status(200).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
