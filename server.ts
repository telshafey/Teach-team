import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import pg from "pg";
import fs from "fs";
import { z } from "zod";

dotenv.config();

async function runOnStartMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("[Migration] No DATABASE_URL in environment, skipping on-startup SQL migration.");
    return;
  }
  const pgClient = new pg.Client({ connectionString: dbUrl });
  try {
    await pgClient.connect();
    console.log("[Migration] Connected for on-startup RLS policy repairs.");
    const filepath = "./database/migrations/029_fix_rls_approvals.sql";
    if (fs.existsSync(filepath)) {
      console.log("[Migration] Executing:", filepath);
      const sqlStr = fs.readFileSync(filepath, "utf8");
      await pgClient.query(sqlStr);
      console.log("[Migration] RLS permissions successfully corrected and synchronized!");
    } else {
      console.warn("[Migration] File not found:", filepath);
    }
  } catch (err: any) {
    console.error("[Migration] On-startup SQL execution failed:", err.message);
  } finally {
    try {
      await pgClient.end();
    } catch {
      console.warn("[Migration] RLS client connection cleanup warning.");
    }
  }
}

async function startServer() {
  await runOnStartMigrations();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Trust reverse proxy (Cloud Run / Nginx / Load Balancer) to get real client IP
  app.set("trust proxy", 1);

  // Keep-alive endpoint to prevent Supabase from pausing (No Rate Limiting)
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

  // --- RATE LIMITERS ---

  // A. limiterPublic (للـ endpoints العامة):
  const limiterPublic = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 20, // 20 طلب من نفس IP
    message: { error: "too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Exclude routes that have their own rate limiters, and the keep-alive route
      const path = req.originalUrl || req.url || "";
      return path.startsWith("/api/invite") ||
             path.startsWith("/api/admin") ||
             path.startsWith("/api/team") ||
             path.startsWith("/api/keep-alive");
    }
  });

  // B. limiterInvite (للـ invite endpoints — أكثر صرامة):
  const limiterInvite = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ساعة
    max: 5, // 5 محاولات فقط في الساعة
    message: { error: "too many invite attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // C. limiterAdmin (للـ admin endpoints — مرن):
  const limiterAdmin = rateLimit({
    windowMs: 60 * 1000, // 1 دقيقة
    max: 100, // 100 طلب/دقيقة
    message: { error: "too many admin requests, please slow down" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply Rate Limiting globally to specific route groups
  app.use("/api/invite", limiterInvite); // يشمل /verify و /accept
  app.use("/api/admin", limiterAdmin); // يشمل كل /api/admin/*
  app.use("/api/team", limiterAdmin); // يشمل كل /api/team/*
  app.use("/api", limiterPublic); // fallback لباقي الـ endpoints

  // --- INPUT VALIDATION SCHEMAS & HELPERS (Zod) ---

  const InviteAcceptSchema = z.object({
    token: z.string().uuid("رابط الدعوة غير صالح"),
    name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100),
    password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(128),
  });

  const InviteCreateSchema = z.object({
    email: z.string().email("البريد الإلكتروني غير صالح"),
    roleId: z.string().uuid("معرف الدور غير صالح"),
  });

  const MemberUpdateSchema = z.object({
    memberId: z.number().int().positive(),
    updates: z.object({
      name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100).optional(),
      email: z.string().email("البريد الإلكتروني غير صالح").optional(),
      roleId: z.string().uuid("معرف الدور غير صالح").or(z.string()).optional(),
      password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(128).optional(),
      reportsTo: z.number().int().positive().nullable().optional(),
      avatarUrl: z.string().optional(),
      employmentType: z.string().optional(),
      salary: z.number().nullable().optional(),
      hourlyRate: z.number().nullable().optional(),
      weeklyHoursRequirement: z.number().nullable().optional(),
      daysOff: z.array(z.string()).optional(),
    }).strict(),
    email: z.string().email("البريد الإلكتروني غير صالح").optional(),
  }).strict();

  const MemberCreateSchema = z.object({
    email: z.string().email("البريد الإلكتروني غير صالح"),
    password: z.string().min(8, "كلمة المرور قصيرة جداً").max(128),
    name: z.string().min(2, "الاسم قصير").max(100),
    roleId: z.string().uuid("معرف الدور غير صالح").or(z.string()),
    reportsTo: z.number().int().positive().nullable().optional(),
    avatarUrl: z.string().optional(),
    employmentType: z.string().optional(),
    salary: z.number().nullable().optional(),
    hourlyRate: z.number().nullable().optional(),
    weeklyHoursRequirement: z.number().nullable().optional(),
    daysOff: z.array(z.string()).optional(),
  }).strict();

  const validate = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } => {
    const result = schema.safeParse(data);
    if (!result.success) {
      return { success: false, error: result.error.errors[0].message };
    }
    return { success: true, data: result.data };
  };

  interface AuditLogEntry {
    actorId?: number;
    actorEmail?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }

  const logAudit = async (entry: AuditLogEntry) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) return;

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: entry.actorId,
        actor_email: entry.actorEmail,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        old_values: entry.oldValues,
        new_values: entry.newValues,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
      }]);
    } catch (err) {
      console.error("Audit logging failed:", err);
    }
  };

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
      const validation = validate(MemberUpdateSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }
      const { memberId, updates } = validation.data;
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

      const adminEmail = (req as any).user.email;
      const { data: adminMember } = await supabaseAdmin
        .from("team_members")
        .select("id")
        .eq("auth_user_id", (req as any).user.id)
        .single();
      const adminMemberId = adminMember?.id;

      const { password, ...memberUpdates } = updates;

      const { data: memberData, error: memberError } = await supabaseAdmin
        .from("team_members")
        .select("*")
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

      const oldValuesLog = memberData ? { ...memberData } : {};
      delete (oldValuesLog as any).password;

      const newValuesLog = updates ? { ...updates } : {};
      delete (newValuesLog as any).password;

      await logAudit({
        actorId: adminMemberId,
        actorEmail: adminEmail,
        action: 'member_updated',
        entityType: 'member',
        entityId: memberId.toString(),
        oldValues: oldValuesLog,
        newValues: newValuesLog,
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

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
      const validation = validate(MemberCreateSchema, req.body.memberData);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }
      const { email, password, ...restOfData } = validation.data;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({
          error: "Missing SUPABASE_SERVICE_ROLE_KEY.",
        });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      const adminEmail = (req as any).user.email;
      const { data: adminMember } = await supabaseAdmin
        .from("team_members")
        .select("id")
        .eq("auth_user_id", (req as any).user.id)
        .single();
      const adminMemberId = adminMember?.id;

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

      const insertedMemberLog = insertedMember ? { ...insertedMember } : {};
      delete (insertedMemberLog as any).password;
      await logAudit({
        actorId: adminMemberId,
        actorEmail: adminEmail,
        action: 'member_created',
        entityType: 'member',
        entityId: insertedMember?.id?.toString(),
        newValues: insertedMemberLog,
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

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

  app.get("/api/admin/team_members", verifyToken, async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const { data, error } = await supabaseAdmin.from("team_members").select("*, roles(*)");
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/projects", verifyToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      
      // 1. Get current team member profile
      const { data: member, error: memberError } = await supabaseAdmin
        .from("team_members")
        .select("id, role_id, roles(name)")
        .eq("auth_user_id", user.id)
        .single();

      if (memberError || !member) {
        return res.status(403).json({ error: "Forbidden: User record not found" });
      }

      const memberId = member.id;
      const roleId = member.role_id;
      const roleName = (member.roles as any)?.name;

      const isAdmin = 
        roleId === "gm" || 
        roleId === "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" || 
        roleName === "General Manager" || 
        roleName === "admin" ||
        roleName === "Admin";

      // 2. Fetch all projects using service role (bypassing RLS)
      const { data: allProjects, error: projectsError } = await supabaseAdmin
        .from("projects")
        .select("*");

      if (projectsError) {
        return res.status(500).json({ error: projectsError.message });
      }

      if (isAdmin) {
        return res.status(200).json(allProjects || []);
      }

      // 3. Filter projects for normal user
      const filteredProjects = (allProjects || []).filter((project: any) => {
        if (project.creator_id === memberId) return true;
        const membersList = Array.isArray(project.members) ? project.members : [];
        return membersList.some((m: any) => {
          const mId = m?.team_member_id || m?.teamMemberId || m?.id || m?.member_id;
          return String(mId) === String(memberId);
        });
      });

      res.status(200).json(filteredProjects);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/tasks", verifyToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      
      // 1. Get current team member profile
      const { data: member, error: memberError } = await supabaseAdmin
        .from("team_members")
        .select("id, role_id, roles(name)")
        .eq("auth_user_id", user.id)
        .single();

      if (memberError || !member) {
        return res.status(403).json({ error: "Forbidden: User record not found" });
      }

      const memberId = member.id;
      const roleId = member.role_id;
      const roleName = (member.roles as any)?.name;

      const isAdmin = 
        roleId === "gm" || 
        roleId === "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" || 
        roleName === "General Manager" || 
        roleName === "admin" ||
        roleName === "Admin";

      // 2. Fetch all tasks using service role (bypassing RLS)
      const { data: allTasks, error: tasksError } = await supabaseAdmin
        .from("tasks")
        .select("*");

      if (tasksError) {
        return res.status(500).json({ error: tasksError.message });
      }

      if (isAdmin) {
        return res.status(200).json(allTasks || []);
      }

      // 3. For normal users, fetch all projects to check membership
      const { data: allProjects } = await supabaseAdmin
        .from("projects")
        .select("id, creator_id, members");

      const allowedProjectIds = new Set<string>();
      (allProjects || []).forEach((project: any) => {
        const isCreator = project.creator_id === memberId;
        const membersList = Array.isArray(project.members) ? project.members : [];
        const isMember = membersList.some((m: any) => {
          const mId = m?.team_member_id || m?.teamMemberId || m?.id || m?.member_id;
          return String(mId) === String(memberId);
        });
        if (isCreator || isMember) {
          allowedProjectIds.add(project.id);
        }
      });

      // 4. Filter tasks based on creator, assignee, or if task belongs to user's project
      const filteredTasks = (allTasks || []).filter((task: any) => {
        if (task.creator_id === memberId || task.assigned_to === memberId) return true;
        if (task.project_id && allowedProjectIds.has(task.project_id)) return true;
        return false;
      });

      res.status(200).json(filteredTasks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/daily_logs", verifyToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      
      // 1. Get current team member profile
      const { data: member, error: memberError } = await supabaseAdmin
        .from("team_members")
        .select("id, role_id, roles(name)")
        .eq("auth_user_id", user.id)
        .single();

      if (memberError || !member) {
        return res.status(403).json({ error: "Forbidden: User record not found" });
      }

      const memberId = member.id;
      const roleId = member.role_id;
      const roleName = (member.roles as any)?.name;

      const isAdmin = 
        roleId === "gm" || 
        roleId === "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" || 
        roleName === "General Manager" || 
        roleName === "admin" ||
        roleName === "Admin";

      // 2. Fetch all daily logs
      const { data: allLogs, error: logsError } = await supabaseAdmin
        .from("daily_logs")
        .select("*");

      if (logsError) {
        return res.status(500).json({ error: logsError.message });
      }

      if (isAdmin) {
        return res.status(200).json(allLogs || []);
      }

      // 3. Filter for current user
      const filteredLogs = (allLogs || []).filter((log: any) => {
        return log.team_member_id === memberId;
      });

      res.status(200).json(filteredLogs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/task_comments", verifyToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      
      // 1. Get current team member profile
      const { data: member, error: memberError } = await supabaseAdmin
        .from("team_members")
        .select("id, role_id, roles(name)")
        .eq("auth_user_id", user.id)
        .single();

      if (memberError || !member) {
        return res.status(403).json({ error: "Forbidden: User record not found" });
      }

      const memberId = member.id;
      const roleId = member.role_id;
      const roleName = (member.roles as any)?.name;

      const isAdmin = 
        roleId === "gm" || 
        roleId === "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" || 
        roleName === "General Manager" || 
        roleName === "admin" ||
        roleName === "Admin";

      // 2. Fetch all comments
      const { data: allComments, error: commentsError } = await supabaseAdmin
        .from("task_comments")
        .select("*");

      if (commentsError) {
        return res.status(500).json({ error: commentsError.message });
      }

      if (isAdmin) {
        return res.status(200).json(allComments || []);
      }

      // 3. Get projects member is in
      const { data: allProjects } = await supabaseAdmin
        .from("projects")
        .select("id, creator_id, members");

      const allowedProjectIds = new Set<string>();
      (allProjects || []).forEach((project: any) => {
        const isCreator = project.creator_id === memberId;
        const membersList = Array.isArray(project.members) ? project.members : [];
        const isMember = membersList.some((m: any) => {
          const mId = m?.team_member_id || m?.teamMemberId || m?.id || m?.member_id;
          return String(mId) === String(memberId);
        });
        if (isCreator || isMember) {
          allowedProjectIds.add(project.id);
        }
      });

      // 4. Fetch tasks to filter by project_id
      const { data: allTasks } = await supabaseAdmin
        .from("tasks")
        .select("id, project_id, creator_id, assigned_to");

      const allowedTaskIds = new Set<string>();
      (allTasks || []).forEach((task: any) => {
        if (task.creator_id === memberId || task.assigned_to === memberId) {
          allowedTaskIds.add(task.id);
        } else if (task.project_id && allowedProjectIds.has(task.project_id)) {
          allowedTaskIds.add(task.id);
        }
      });

      const filteredComments = (allComments || []).filter((comment: any) => {
        return allowedTaskIds.has(comment.task_id);
      });

      res.status(200).json(filteredComments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/task_attachments", verifyToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      
      // 1. Get current team member profile
      const { data: member, error: memberError } = await supabaseAdmin
        .from("team_members")
        .select("id, role_id, roles(name)")
        .eq("auth_user_id", user.id)
        .single();

      if (memberError || !member) {
        return res.status(403).json({ error: "Forbidden: User record not found" });
      }

      const memberId = member.id;
      const roleId = member.role_id;
      const roleName = (member.roles as any)?.name;

      const isAdmin = 
        roleId === "gm" || 
        roleId === "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" || 
        roleName === "General Manager" || 
        roleName === "admin" ||
        roleName === "Admin";

      // 2. Fetch all attachments
      const { data: allAttachments, error: attachmentsError } = await supabaseAdmin
        .from("task_attachments")
        .select("*");

      if (attachmentsError) {
        return res.status(500).json({ error: attachmentsError.message });
      }

      if (isAdmin) {
        return res.status(200).json(allAttachments || []);
      }

      // 3. Get projects member is in
      const { data: allProjects } = await supabaseAdmin
        .from("projects")
        .select("id, creator_id, members");

      const allowedProjectIds = new Set<string>();
      (allProjects || []).forEach((project: any) => {
        const isCreator = project.creator_id === memberId;
        const membersList = Array.isArray(project.members) ? project.members : [];
        const isMember = membersList.some((m: any) => {
          const mId = m?.team_member_id || m?.teamMemberId || m?.id || m?.member_id;
          return String(mId) === String(memberId);
        });
        if (isCreator || isMember) {
          allowedProjectIds.add(project.id);
        }
      });

      // 4. Fetch tasks to filter by project_id
      const { data: allTasks } = await supabaseAdmin
        .from("tasks")
        .select("id, project_id, creator_id, assigned_to");

      const allowedTaskIds = new Set<string>();
      (allTasks || []).forEach((task: any) => {
        if (task.creator_id === memberId || task.assigned_to === memberId) {
          allowedTaskIds.add(task.id);
        } else if (task.project_id && allowedProjectIds.has(task.project_id)) {
          allowedTaskIds.add(task.id);
        }
      });

      const filteredAttachments = (allAttachments || []).filter((attachment: any) => {
        return allowedTaskIds.has(attachment.task_id);
      });

      res.status(200).json(filteredAttachments);
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
      const validation = validate(InviteAcceptSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }
      const { token, name, password } = validation.data;

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
      const validation = validate(InviteCreateSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }
      const { email, roleId } = validation.data;

      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      const adminEmail = (req as any).user.email;
      const { data: adminMember } = await supabaseAdmin
        .from("team_members")
        .select("id")
        .eq("auth_user_id", (req as any).user.id)
        .single();
      const adminMemberId = adminMember?.id;

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

      await logAudit({
        actorId: adminMemberId,
        actorEmail: adminEmail,
        action: 'invite_created',
        entityType: 'invite',
        entityId: invite.id,
        newValues: invite,
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

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

      const adminEmail = (req as any).user.email;
      const { data: adminMember } = await supabaseAdmin
        .from("team_members")
        .select("id")
        .eq("auth_user_id", (req as any).user.id)
        .single();
      const adminMemberId = adminMember?.id;

      await logAudit({
        actorId: adminMemberId,
        actorEmail: adminEmail,
        action: 'invite_revoked',
        entityType: 'invite',
        entityId: id,
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

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

  // Proxy endpoints for comments and attachments to bypass RLS restrictions
  app.post("/api/task_comments", verifyToken, async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const { taskId, authorId, text, timestamp } = req.body;

      if (!taskId || !authorId || !text) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if team member exists and match the user's ID
      const { data: member, error: memberError } = await supabaseAdmin
        .from("team_members")
        .select("id")
        .eq("auth_user_id", (req as any).user.id)
        .single();

      if (memberError || !member || member.id !== authorId) {
        return res.status(403).json({ error: "Forbidden: Author mismatch" });
      }

      const { data, error } = await supabaseAdmin
        .from("task_comments")
        .insert({
          task_id: taskId,
          author_id: authorId,
          text: text,
          timestamp: timestamp || new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ success: true, data });
    } catch (err: any) {
      console.error("Insert comment proxy error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/task_comments/:id", verifyToken, async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const commentId = req.params.id;

      // Check if user is the author or admin
      const { data: comment, error: commentError } = await supabaseAdmin
        .from("task_comments")
        .select("author_id")
        .eq("id", commentId)
        .single();

      if (commentError || !comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      const { data: member, error: memberError } = await supabaseAdmin
        .from("team_members")
        .select("id, role_id, roles(name)")
        .eq("auth_user_id", (req as any).user.id)
        .single();

      if (memberError || !member) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const roleName = (member.roles as any)?.name;
      const isAdmin = member.role_id === "gm" || roleName === "Admin" || roleName === "General Manager" || roleName === "admin";

      if (member.id !== comment.author_id && !isAdmin) {
        return res.status(403).json({ error: "Forbidden: Not the author or admin" });
      }

      const { error } = await supabaseAdmin
        .from("task_comments")
        .delete()
        .eq("id", commentId);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Delete comment proxy error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/task_attachments", verifyToken, async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const { taskId, uploaderId, fileName, fileUrl, fileSize, mimeType, timestamp } = req.body;

      if (!taskId || !uploaderId || !fileName || !fileUrl) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { data: member, error: memberError } = await supabaseAdmin
        .from("team_members")
        .select("id")
        .eq("auth_user_id", (req as any).user.id)
        .single();

      if (memberError || !member || member.id !== uploaderId) {
        return res.status(403).json({ error: "Forbidden: Uploader mismatch" });
      }

      const { data, error } = await supabaseAdmin
        .from("task_attachments")
        .insert({
          task_id: taskId,
          uploader_id: uploaderId,
          file_name: fileName,
          file_url: fileUrl,
          file_size: fileSize,
          mime_type: mimeType,
          timestamp: timestamp || new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ success: true, data });
    } catch (err: any) {
      console.error("Insert attachment proxy error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/task_attachments/:id", verifyToken, async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing config" });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const attachmentId = req.params.id;

      const { data: attachment, error: attachmentError } = await supabaseAdmin
        .from("task_attachments")
        .select("uploader_id")
        .eq("id", attachmentId)
        .single();

      if (attachmentError || !attachment) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      const { data: member, error: memberError } = await supabaseAdmin
        .from("team_members")
        .select("id, role_id, roles(name)")
        .eq("auth_user_id", (req as any).user.id)
        .single();

      if (memberError || !member) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const roleName = (member.roles as any)?.name;
      const isAdmin = member.role_id === "gm" || roleName === "Admin" || roleName === "General Manager" || roleName === "admin";

      if (member.id !== attachment.uploader_id && !isAdmin) {
        return res.status(403).json({ error: "Forbidden: Not the uploader or admin" });
      }

      const { error } = await supabaseAdmin
        .from("task_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Delete attachment proxy error:", err);
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
