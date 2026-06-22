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

      (req as any).user = user;
      next();
    } catch (err: any) {
      console.error("verifyToken error:", err);
      res.status(500).json({
        error: "Internal Server Error in authentication verification",
      });
    }
  };

  // Middleware to verify if the authenticated user has Admin or General Manager privileges
  const verifyAdmin = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ): Promise<void> => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ error: "Unauthorized: Missing user information" });
        return;
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        res.status(500).json({ error: "Missing config" });
        return;
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      
      const { data: member, error: memberError } = await supabaseAdmin
        .from("team_members")
        .select("role_id, roles(name)")
        .eq("auth_user_id", user.id)
        .single();

      if (memberError || !member) {
        res.status(403).json({ error: "Forbidden: User record not found" });
        return;
      }

      const roleId = member.role_id;
      const roleName = (member.roles as any)?.name;

      const isAdmin = 
        roleId === "gm" || 
        roleId === "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" || 
        roleName === "General Manager" || 
        roleName === "admin" ||
        roleName === "Admin";

      if (!isAdmin) {
        res.status(403).json({ error: "Forbidden: Admin or General Manager privileges required" });
        return;
      }

      next();
    } catch (err: any) {
      console.error("verifyAdmin error:", err);
      res.status(500).json({
        error: "Internal Server Error in admin authorization verification",
      });
    }
  };

  // Helper to create a Supabase client bound to the requesting user's security context (enforces RLS)
  const getUserClient = (req: express.Request) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error("Missing Supabase URL or Anon Key in environment");
    }

    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace("Bearer ", "") : "";

    return createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  };

  // API Routes
  app.post("/api/team/admin-update-member", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const { memberId, updates } = req.body;
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

  app.post("/api/admin/site-settings/upsert", verifyToken, verifyAdmin, async (req, res) => {
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

  app.post("/api/team/admin-update-role", verifyToken, verifyAdmin, async (req, res) => {
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

  app.post("/api/team/admin-create-member", verifyToken, verifyAdmin, async (req, res) => {
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

  app.post("/api/admin/run-sql", verifyToken, verifyAdmin, async (req, res) => {
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

  app.get("/api/admin/tasks", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const supabaseUser = getUserClient(req);
      const { data, error } = await supabaseUser.from("tasks").select("*");
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/projects", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const supabaseUser = getUserClient(req);
      const { data, error } = await supabaseUser.from("projects").select("*");
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/team_members", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const supabaseUser = getUserClient(req);
      const { data, error } = await supabaseUser.from("team_members").select("*");
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/daily_logs", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const supabaseUser = getUserClient(req);
      const { data, error } = await supabaseUser.from("daily_logs").select("*");
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- INVITATION SYSTEM ENDPOINTS ---

  // Verify invitation token (Public)
  app.get("/api/invite/verify", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "رابط الدعوة غير صالح أو مفقود" });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      const { data: invite, error } = await supabaseAdmin
        .from("invites")
        .select("*, roles(id, name)")
        .eq("token", token)
        .eq("used", false)
        .single();

      if (error || !invite) {
        return res.status(404).json({ error: "عذراً، هذه الدعوة غير صالحة أو تم استخدامها مسبقاً." });
      }

      // Check expiry if set
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return res.status(410).json({ error: "عذراً، لقد انتهت صلاحية هذه الدعوة." });
      }

      res.status(200).json({
        success: true,
        email: invite.email,
        roleId: invite.role_id,
        roleName: (invite.roles as any)?.name || "عضو فريق",
      });
    } catch (err: any) {
      console.error("Invite verify error:", err);
      res.status(500).json({ error: "حدث خطأ أثناء التحقق من الدعوة" });
    }
  });

  // Accept invitation & Sign Up (Public)
  app.post("/api/invite/accept", async (req, res) => {
    try {
      const { token, name, password } = req.body;
      if (!token || !name || !password) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      // 1. Recalculate invite viability to prevent double sign-ups
      const { data: invite, error: inviteError } = await supabaseAdmin
        .from("invites")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .single();

      if (inviteError || !invite) {
        return res.status(404).json({ error: "عذراً، هذه الدعوة لم تعد صالحة." });
      }

      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return res.status(410).json({ error: "عذراً، لقد انتهت صلاحية هذه الدعوة." });
      }

      // 2. Create the user inside Supabase Auth
      const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: invite.email,
        password: password,
        email_confirm: true,
      });

      if (createUserError) {
        return res.status(500).json({ error: "تعذر إنشاء حساب للتسجيل: " + createUserError.message });
      }

      const authUserId = authUser.user.id;

      // 3. Mark the invite as used
      await supabaseAdmin
        .from("invites")
        .update({ used: true })
        .eq("id", invite.id);

      // 4. Update the corresponding team_members row
      const { error: tmUpdateError } = await supabaseAdmin
        .from("team_members")
        .update({
          name: name,
          email: invite.email,
          role_id: invite.role_id,
        })
        .eq("auth_user_id", authUserId);

      if (tmUpdateError) {
        console.error("Failed to update team member info on invite accept:", tmUpdateError);
      }

      res.status(200).json({
        success: true,
        email: invite.email,
        message: "تم إنشاء حسابك وتفعيل عضويتك بنجاح!",
      });
    } catch (err: any) {
      console.error("Invite accept error:", err);
      res.status(500).json({ error: "حدث خطأ غير متوقع أثناء تفعيل الحساب." });
    }
  });

  // Admin GET all invites
  app.get("/api/admin/invites", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const supabaseUser = getUserClient(req);
      const { data, error } = await supabaseUser
        .from("invites")
        .select("*, roles(id, name)")
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ success: true, invites: data });
    } catch (err: any) {
      console.error("Get invites error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin POST create invite
  app.post("/api/admin/invites/create", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const { email, roleId } = req.body;
      if (!email || !roleId) {
        return res.status(400).json({ error: "البريد الإلكتروني والدور مطلوبان" });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      // Check if user already exists
      const { data: existingMember } = await supabaseAdmin
        .from("team_members")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingMember) {
        return res.status(400).json({ error: "هذا البريد الإلكتروني مسجل بالفعل كعضو فريق" });
      }

      // Generate secure token
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");

      // Set expiration to 7 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: invite, error } = await supabaseAdmin
        .from("invites")
        .insert([
          {
            email,
            role_id: roleId,
            token,
            expires_at: expiresAt.toISOString(),
          },
        ])
        .select("*, roles(id, name)")
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ success: true, invite });
    } catch (err: any) {
      console.error("Create invite error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin DELETE (revoke) invite
  app.delete("/api/admin/invites/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const { error } = await supabaseAdmin
        .from("invites")
        .delete()
        .eq("id", id);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Delete invite error:", err);
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
      const { error } = await supabaseAdmin
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
