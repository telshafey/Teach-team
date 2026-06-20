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

  // Middleware to verify if the request comes from an authenticated user
  const verifyToken = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res
          .status(401)
          .json({ error: "Unauthorized: Missing Authorization header" });
        return;
      }

      const token = authHeader.replace("Bearer ", "");
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        res.status(500).json({ error: "Missing config" });
        return;
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        res.status(401).json({ error: "Unauthorized: Invalid token" });
        return;
      }

      next();
    } catch (err: any) {
      console.error("verifyToken error:", err);
      res.status(500).json({
        error: "Internal Server Error in authentication verification",
      });
    }
  };

  // API Routes
  app.post("/api/team/admin-update-member", verifyToken, async (req, res) => {
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
      const targetEmail = memberUpdates.email || memberData.email;
      const emailChanged =
        memberUpdates.email && memberUpdates.email !== memberData.email;

      if (password || emailChanged) {
        if (!authUserId) {
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
            // update existing user's password if provided
            if (password) {
              await supabaseAdmin.auth.admin.updateUserById(authUserId, {
                password,
                email_confirm: true,
              });
            }
            await supabaseAdmin
              .from("team_members")
              .update({ auth_user_id: authUserId })
              .eq("id", memberId);
          } else {
            // Create the user
            if (!password) {
              return res
                .status(400)
                .json({
                  error:
                    "يجب تعيين كلمة مرور لإنشاء حساب تسجيل الدخول للمستخدم لأول مرة.",
                });
            }
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
        } else {
          // authUserId exists, update the user
          const authUpdates: any = { email_confirm: true };
          if (password) authUpdates.password = password;
          if (emailChanged) authUpdates.email = memberUpdates.email;

          const { error: authUpdateError } =
            await supabaseAdmin.auth.admin.updateUserById(
              authUserId,
              authUpdates,
            );

          if (authUpdateError) {
            if (authUpdateError.message.includes("User not found")) {
              if (!password) {
                return res
                  .status(400)
                  .json({
                    error:
                      "حساب المستخدم غير موجود. يرجى تعيين كلمة مرور للمتابعة.",
                  });
              }
              const { data: newUser, error: createError } =
                await supabaseAdmin.auth.admin.createUser({
                  email: targetEmail,
                  password,
                  email_confirm: true,
                });
              if (createError) {
                return res
                  .status(500)
                  .json({
                    error:
                      "تعذر إنشاء حساب تسجيل الدخول: " + createError.message,
                  });
              }
              authUserId = newUser.user.id;
              await supabaseAdmin
                .from("team_members")
                .update({ auth_user_id: authUserId })
                .eq("id", memberId);
            } else {
              return res.status(500).json({ error: authUpdateError.message });
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

  app.post("/api/admin/site-settings/upsert", verifyToken, async (req, res) => {
    try {
      const { payload } = req.body;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      const { data, error } = await supabaseAdmin
        .from("site_settings")
        .upsert(payload)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ success: true, data });
    } catch (err: any) {
      console.error("Admin site settings upsert error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/team/admin-update-role", verifyToken, async (req, res) => {
    try {
      const { roleId, updates } = req.body;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      const payload = Object.fromEntries(
        Object.entries(updates).map(([key, value]) => {
          const snake = key.replace(
            /[A-Z]/g,
            (letter) => `_${letter.toLowerCase()}`,
          );
          return [snake, value];
        }),
      );

      const { data, error } = await supabaseAdmin
        .from("roles")
        .update(payload)
        .eq("id", roleId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ success: true, data });
    } catch (err: any) {
      console.error("Admin role update error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/team/admin-create-member", verifyToken, async (req, res) => {
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
        if (
          createError.message.includes("already registered") ||
          createError.message.includes("already exists")
        ) {
          errorMsg = "البريد الإلكتروني مسجل بالفعل لموظف آخر.";
        }
        return res.status(500).json({
          error: errorMsg,
        });
      }

      const authUserId = newUser.user.id;

      // Update team_members (trigger already inserted the base row)
      const payload = Object.fromEntries(
        Object.entries({ ...restOfData, email }).map(([key, value]) => {
          const snake = key.replace(
            /[A-Z]/g,
            (letter) => `_${letter.toLowerCase()}`,
          );
          return [snake, value];
        }),
      );

      const { data: insertedMember, error: dbUpdateError } = await supabaseAdmin
        .from("team_members")
        .update(payload)
        .eq("auth_user_id", authUserId)
        .select()
        .single();

      if (dbUpdateError) {
        // Cleanup auth user if team_member update fails
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        let errorMsg = "تعذر تحديث العضو في القاعدة: " + dbUpdateError.message;
        if (
          dbUpdateError.code === "23505" &&
          dbUpdateError.message.includes("team_members_email_key")
        ) {
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

  app.post("/api/admin/run-sql", verifyToken, async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const { data, error } = await supabaseAdmin
        .from("projects")
        .select("id, name, members");
      if (error) {
        return res.status(500).json({ error });
      }

      res.status(200).json({ success: true, count: data.length, data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/tasks", verifyToken, async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const { data, error } = await supabaseAdmin.from("tasks").select("*");
      if (error) {
        return res.status(500).json({ error });
      }

      res.status(200).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Keep-alive endpoint to prevent Supabase from pausing
  app.get("/api/keep-alive", async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ status: "config_missing" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      // Perform a lightweight query to keep DB active
      const { data, error } = await supabaseAdmin
        .from("team_members")
        .select("id")
        .limit(1);

      if (error) {
        return res
          .status(500)
          .json({ status: "error", message: error.message });
      }

      res
        .status(200)
        .json({ status: "ok", timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
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
