import type { Express } from "express";
import { type Server } from "http";
import passport from "passport";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin, requireNotBlocked } from "./auth";
import { registerSchema, loginSchema, insertPostSchema, insertCommentSchema, insertForumTopicSchema, insertForumReplySchema, insertQASchema, insertReportSchema } from "@shared/schema";
import { ZodError } from "zod";

const SPAM_WORDS = ["viagra", "casino", "lottery", "win big", "click here", "free money", "buy now", "nigger", "faggot"];

function containsSpam(text: string): boolean {
  const lower = text.toLowerCase();
  return SPAM_WORDS.some(word => lower.includes(word));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).json({ message: "This username is already taken" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 12);

      const user = await storage.createUser({
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: "user",
        avatar: null,
        googleId: null,
        appleId: null,
        acceptedTerms: true,
        termsAcceptedAt: new Date(),
      });

      await storage.createActivityLog(user.id, "register", `User ${user.username} registered`);

      req.login(
        { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar },
        (err) => {
          if (err) return res.status(500).json({ message: "Login after registration failed" });
          return res.status(201).json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
          });
        }
      );
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Register error:", err);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    try {
      loginSchema.parse(req.body);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return res.status(500).json({ message: "Login failed" });
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });

      req.login(user, async (loginErr) => {
        if (loginErr) return res.status(500).json({ message: "Session creation failed" });
        await storage.createActivityLog(user.id, "login", `User ${user.username} logged in`);
        return res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    const userId = req.user?.id;
    const username = req.user?.username;
    req.logout(async (err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      if (userId) {
        await storage.createActivityLog(userId, "logout", `User ${username} logged out`);
      }
      return res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    return res.json(req.user);
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/auth?error=google_failed" }),
      (_req, res) => {
        res.redirect("/");
      }
    );
  }

  // ── Edit Profile ──

  app.put("/api/auth/profile", requireAuth, async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    const currentUser = await storage.getUser(userId);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const updates: Partial<typeof currentUser> = {};

    if (username && username !== currentUser.username) {
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ message: "Username must be between 3 and 30 characters" });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ message: "Username can only contain letters, numbers and underscores" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing && existing.id !== userId) {
        return res.status(400).json({ message: "Username already taken" });
      }
      updates.username = username;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      if (!currentUser.password) {
        return res.status(400).json({ message: "Cannot change password for accounts authenticated with Google" });
      }
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required" });
      }
      const valid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!valid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      updates.password = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No changes provided" });
    }

    const updated = await storage.updateUser(userId, updates);
    return res.json({ username: updated?.username });
  });

  // ── User Profile Routes ──

  app.get("/api/users/:username", async (req, res) => {
    const user = await storage.getUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ message: "User not found" });

    const forumTopics = await storage.getForumTopicsByAuthor(user.id);
    const forumReplies = await storage.getForumRepliesByAuthor(user.id);
    const userPosts = user.role === "admin" ? await storage.getPostsByAuthor(user.id) : [];

    return res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      stats: {
        forumTopics: forumTopics.length,
        forumReplies: forumReplies.length,
        posts: userPosts.length,
      },
      forumTopics: forumTopics.slice(0, 10),
      posts: userPosts.slice(0, 10),
    });
  });

  // ── GDPR: Export own data ──

  app.get("/api/auth/export-data", requireAuth, async (req, res) => {
    try {
      const data = await storage.exportUserData(req.user!.id);
      if (!data) return res.status(404).json({ message: "User not found" });
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="user-data-${req.user!.id}.json"`);
      return res.json(data);
    } catch (err) {
      console.error("Export data error:", err);
      return res.status(500).json({ message: "Failed to export data" });
    }
  });

  // ── Account Deletion (Right to be Forgotten) ──

  app.post("/api/auth/delete-account", requireAuth, async (req, res) => {
    try {
      const { password, fullDelete } = req.body;
      const userId = req.user!.id;

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.password) {
        if (!password) {
          return res.status(400).json({ message: "Password is required to delete your account" });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return res.status(403).json({ message: "Incorrect password. Account deletion cancelled." });
        }
      }

      if (user.role === "admin") {
        const adminCount = await storage.countAdmins();
        if (adminCount <= 1) {
          return res.status(403).json({
            message: "You are the only administrator. Please transfer the admin role to another user before deleting your account."
          });
        }
      }

      await storage.createActivityLog(userId, "account_delete", `User ${user.username} deleted their account`);

      if (fullDelete) {
        await storage.fullDeleteUser(userId);
      } else {
        await storage.anonymizeUserContent(userId, `[deleted_user_${userId}]`);
      }

      req.logout((err) => {
        if (err) {
          console.error("Logout error during account deletion:", err);
        }
        req.session.destroy((sessionErr) => {
          if (sessionErr) {
            console.error("Session destroy error:", sessionErr);
          }
          return res.json({ message: "Account deleted successfully" });
        });
      });
    } catch (err) {
      console.error("Account deletion error:", err);
      return res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // ── Posts Routes (admin-only for create/edit/delete) ──

  app.get("/api/posts", async (req, res) => {
    const category = req.query.category as string | undefined;
    const postsData = await storage.getPosts(category);
    return res.json(postsData);
  });

  app.get("/api/posts/latest", async (_req, res) => {
    const postsData = await storage.getLatestPosts(6);
    return res.json(postsData);
  });

  const viewThrottle = new Map<string, number>();

  app.get("/api/posts/:id", async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid post ID" });

    const post = await storage.getPost(id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    return res.json(post);
  });

  app.post("/api/posts/:id/view", async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid post ID" });

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const userId = req.isAuthenticated() && req.user ? req.user.id : 0;
    const key = `${id}:${userId || ip}`;
    const now = Date.now();
    const lastView = viewThrottle.get(key);

    if (lastView && now - lastView < 60000) {
      return res.json({ throttled: true });
    }

    viewThrottle.set(key, now);
    if (viewThrottle.size > 10000) {
      const entries = [...viewThrottle.entries()];
      entries.sort((a, b) => a[1] - b[1]);
      for (let i = 0; i < entries.length - 5000; i++) {
        viewThrottle.delete(entries[i][0]);
      }
    }

    await storage.incrementPostViews(id);
    return res.json({ throttled: false });
  });

  app.post("/api/posts/:id/share", async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid post ID" });

    const post = await storage.getPost(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    await storage.incrementPostShares(id);
    return res.json({ shares: (post.shares || 0) + 1 });
  });

  app.post("/api/posts", requireAdmin, async (req, res) => {
    try {
      const data = insertPostSchema.parse(req.body);

      if (containsSpam(data.title) || containsSpam(data.content)) {
        return res.status(400).json({ message: "Content flagged as inappropriate" });
      }

      const post = await storage.createPost({ ...data, authorId: req.user!.id });
      await storage.createActivityLog(req.user!.id, "post_create", `Created article: ${post.title}`);
      return res.status(201).json(post);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.put("/api/posts/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid post ID" });

    const post = await storage.getPost(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const updated = await storage.updatePost(id, req.body);
    return res.json(updated);
  });

  app.delete("/api/posts/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid post ID" });

    const post = await storage.getPost(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    await storage.deletePost(id);
    await storage.createActivityLog(req.user!.id, "post_delete", `Deleted article: ${post.title}`);
    return res.json({ message: "Post deleted" });
  });

  // ── Comments Routes ──

  app.get("/api/posts/:id/comments", async (req, res) => {
    const postId = parseInt(req.params.id as string);
    if (isNaN(postId)) return res.status(400).json({ message: "Invalid post ID" });
    const commentsData = await storage.getCommentsByPost(postId);
    return res.json(commentsData);
  });

  app.post("/api/posts/:id/comments", requireAuth, requireNotBlocked, async (req, res) => {
    const postId = parseInt(req.params.id as string);
    if (isNaN(postId)) return res.status(400).json({ message: "Invalid post ID" });

    try {
      const data = insertCommentSchema.parse({ ...req.body, postId });

      if (containsSpam(data.content)) {
        return res.status(400).json({ message: "Comment flagged as inappropriate" });
      }

      const comment = await storage.createComment({ ...data, authorId: req.user!.id });
      return res.status(201).json(comment);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.delete("/api/comments/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid comment ID" });

    const comment = await storage.getComment(id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const isOwner = comment.authorId === req.user!.id;
    const isAdmin = req.user!.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    await storage.deleteComment(id);
    return res.json({ message: "Comment deleted" });
  });

  app.delete("/api/forum/replies/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid reply ID" });

    const reply = await storage.getForumReply(id);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    const isOwner = reply.authorId === req.user!.id;
    const isAdmin = req.user!.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this reply" });
    }

    await storage.deleteForumReply(id);
    return res.json({ message: "Reply deleted" });
  });

  app.delete("/api/forum/topics/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid topic ID" });

    const topic = await storage.getForumTopic(id);
    if (!topic) return res.status(404).json({ message: "Topic not found" });

    const isOwner = topic.authorId === req.user!.id;
    const isAdmin = req.user!.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this topic" });
    }

    await storage.deleteForumTopic(id);
    await storage.createActivityLog(
      req.user!.id,
      isOwner ? "forum_topic_delete_own" : "forum_topic_delete_admin",
      `Deleted forum topic #${id}: "${topic.title?.substring(0, 80)}"`
    );
    return res.json({ message: "Topic deleted" });
  });

  // ── Reactions Routes ──

  app.post("/api/reactions", requireAuth, requireNotBlocked, async (req, res) => {
    const { contentType, contentId, type } = req.body;
    if (!contentType || !contentId || !type) {
      return res.status(400).json({ message: "Missing contentType, contentId, or type" });
    }
    if (!["like", "dislike"].includes(type)) {
      return res.status(400).json({ message: "Type must be 'like' or 'dislike'" });
    }
    if (!["post", "comment", "forum_reply"].includes(contentType)) {
      return res.status(400).json({ message: "Invalid contentType" });
    }
    const result = await storage.toggleReaction(req.user!.id, contentType, contentId, type);
    const counts = await storage.getReactionCounts(contentType, contentId);
    const userReaction = await storage.getUserReaction(req.user!.id, contentType, contentId);
    return res.json({ ...result, ...counts, userReaction });
  });

  const validContentTypes = ["post", "comment", "forum_reply"];

  app.get("/api/reactions/:contentType/:contentId", async (req, res) => {
    const { contentType, contentId } = req.params;
    if (!validContentTypes.includes(contentType)) return res.status(400).json({ message: "Invalid contentType" });
    const id = parseInt(contentId);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid contentId" });
    const counts = await storage.getReactionCounts(contentType, id);
    let userReaction: string | null = null;
    if (req.isAuthenticated() && req.user) {
      userReaction = await storage.getUserReaction(req.user.id, contentType, id);
    }
    return res.json({ ...counts, userReaction });
  });

  app.get("/api/reactions/batch/:contentType", async (req, res) => {
    const { contentType } = req.params;
    if (!validContentTypes.includes(contentType)) return res.status(400).json({ message: "Invalid contentType" });
    const idsParam = req.query.ids as string;
    if (!idsParam) return res.json({});
    const ids = idsParam.split(",").map(Number).filter(n => !isNaN(n));
    const counts = await storage.getReactionCountsBatch(contentType, ids);
    let userReactions: Record<number, string> = {};
    if (req.isAuthenticated() && req.user) {
      userReactions = await storage.getUserReactionsBatch(req.user.id, contentType, ids);
    }
    return res.json({ counts, userReactions });
  });

  // ── Forum Routes ──

  app.get("/api/forum/topics", async (req, res) => {
    const categoryId = req.query.categoryId as string | undefined;
    const topics = await storage.getForumTopics(categoryId);
    return res.json(topics);
  });

  app.get("/api/forum/topics/:id", async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid topic ID" });

    const topic = await storage.getForumTopic(id);
    if (!topic) return res.status(404).json({ message: "Topic not found" });
    return res.json(topic);
  });

  app.post("/api/forum/topics", requireAuth, requireNotBlocked, async (req, res) => {
    try {
      const data = insertForumTopicSchema.parse(req.body);

      if (containsSpam(data.title)) {
        return res.status(400).json({ message: "Content flagged as inappropriate" });
      }

      const topic = await storage.createForumTopic({ ...data, authorId: req.user!.id });

      await storage.createNotificationsForAdmins(
        "new_forum_topic",
        "Subiect nou pe forum",
        `${req.user!.username} a creat un subiect nou: "${data.title}"`,
        "forum_topic",
        topic.id
      );

      return res.status(201).json(topic);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(500).json({ message: "Failed to create topic" });
    }
  });

  app.get("/api/forum/topics/:id/replies", async (req, res) => {
    const topicId = parseInt(req.params.id as string);
    if (isNaN(topicId)) return res.status(400).json({ message: "Invalid topic ID" });
    const replies = await storage.getForumReplies(topicId);
    return res.json(replies);
  });

  app.post("/api/forum/topics/:id/replies", requireAuth, requireNotBlocked, async (req, res) => {
    const topicId = parseInt(req.params.id as string);
    if (isNaN(topicId)) return res.status(400).json({ message: "Invalid topic ID" });

    try {
      const data = insertForumReplySchema.parse({ ...req.body, topicId });

      if (containsSpam(data.content)) {
        return res.status(400).json({ message: "Content flagged as inappropriate" });
      }

      const reply = await storage.createForumReply({ ...data, authorId: req.user!.id });
      return res.status(201).json(reply);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(500).json({ message: "Failed to create reply" });
    }
  });

  // ── Q&A Routes ──

  app.get("/api/qa", async (req, res) => {
    const isAdmin = (req as any).user?.role === "admin";
    const userId = (req as any).user?.id;
    const qaData = await storage.getQAs(userId, isAdmin);
    return res.json(qaData);
  });

  app.post("/api/qa", requireAuth, requireNotBlocked, async (req, res) => {
    try {
      const data = insertQASchema.parse(req.body);

      if (containsSpam(data.question)) {
        return res.status(400).json({ message: "Question flagged as inappropriate" });
      }

      const qa = await storage.createQA({
        ...data,
        authorId: req.user!.id,
      });

      await storage.createNotificationsForAdmins(
        "new_qa",
        "Întrebare nouă Q&A",
        `${req.user!.username} a pus o întrebare: "${data.question.substring(0, 100)}"`,
        "qa",
        qa.id
      );

      return res.status(201).json(qa);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(500).json({ message: "Failed to create question" });
    }
  });

  app.put("/api/qa/:id/approve", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid Q&A ID" });
    const updated = await storage.approveQA(id);
    if (!updated) return res.status(404).json({ message: "Question not found" });
    await storage.createActivityLog(req.user!.id, "qa_approve", `Approved question #${id}: "${updated.question.substring(0, 80)}"`);
    return res.json(updated);
  });

  app.delete("/api/qa/:id/reject", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid Q&A ID" });
    const qa = await storage.getQA(id);
    if (!qa) return res.status(404).json({ message: "Question not found" });
    await storage.rejectQA(id);
    await storage.createActivityLog(req.user!.id, "qa_reject", `Rejected question #${id}: "${qa.question.substring(0, 80)}"`);
    return res.json({ message: "Question rejected" });
  });

  app.put("/api/qa/:id/answer", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid Q&A ID" });

    const { answer } = req.body;
    if (!answer) return res.status(400).json({ message: "Answer is required" });

    const updated = await storage.answerQA(id, answer);
    if (!updated) return res.status(404).json({ message: "Question not found" });
    return res.json(updated);
  });

  app.delete("/api/qa/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid Q&A ID" });

    const qa = await storage.getQA(id);
    if (!qa) return res.status(404).json({ message: "Question not found" });

    const isOwner = qa.authorId === req.user!.id;
    const isAdmin = req.user!.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "You can only delete your own questions." });
    }

    await storage.deleteQA(id);

    const actionType = isOwner ? "qa_delete_own" : "qa_delete_admin";
    const details = isOwner
      ? `Deleted own question #${id}: "${qa.question.substring(0, 80)}"`
      : `Admin deleted question #${id} by ${qa.authorName}: "${qa.question.substring(0, 80)}"`;
    await storage.createActivityLog(req.user!.id, actionType, details);

    return res.json({ message: "Question deleted successfully" });
  });

  // ── Reporting Routes ──

  app.post("/api/reports", requireAuth, async (req, res) => {
    try {
      const data = insertReportSchema.parse(req.body);
      const report = await storage.createReport({ ...data, reporterId: req.user!.id });
      await storage.createActivityLog(req.user!.id, "report_create", `Reported ${data.contentType} #${data.contentId}: ${data.reason}`);

      await storage.createNotificationsForAdmins(
        "new_report",
        "Raport nou",
        `${req.user!.username} a raportat conținut (${data.contentType} #${data.contentId}): "${data.reason.substring(0, 80)}"`,
        data.contentType,
        data.contentId
      );

      return res.status(201).json(report);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(500).json({ message: "Failed to create report" });
    }
  });

  // ── Notification Routes ──

  app.get("/api/notifications", requireAdmin, async (req, res) => {
    const notifs = await storage.getNotificationsForAdmin(req.user!.id);
    return res.json(notifs);
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    if (req.user!.role !== "admin") return res.json({ count: 0 });
    const count = await storage.getUnreadNotificationCount(req.user!.id);
    return res.json({ count });
  });

  app.put("/api/notifications/read-all", requireAdmin, async (req, res) => {
    await storage.markAllNotificationsRead(req.user!.id);
    return res.json({ ok: true });
  });

  app.put("/api/notifications/:id/read", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid notification ID" });
    await storage.markNotificationRead(id, req.user!.id);
    return res.json({ ok: true });
  });

  // ── Admin Routes ──

  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    const stats = await storage.getStats();
    return res.json(stats);
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const search = req.query.search as string | undefined;
    const usersList = search ? await storage.searchUsers(search) : await storage.getAllUsers();
    return res.json(usersList.map(u => ({
      id: u.id, username: u.username, email: u.email, role: u.role,
      avatar: u.avatar, isBlocked: u.isBlocked, blockedUntil: u.blockedUntil,
      blockReason: u.blockReason, createdAt: u.createdAt,
    })));
  });

  app.put("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID" });

    const { role } = req.body;
    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const targetUser = await storage.getUser(id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if (targetUser.role === "admin" && role === "user") {
      const adminCount = await storage.countAdmins();
      if (adminCount <= 1) {
        return res.status(403).json({ message: "Cannot demote the last admin" });
      }
    }

    const updated = await storage.updateUser(id, { role });
    const action = role === "admin" ? "admin_promote" : "admin_demote";
    await storage.createActivityLog(req.user!.id, action, `${action === "admin_promote" ? "Promoted" : "Demoted"} user ${targetUser.username} to ${role}`);
    return res.json(updated);
  });

  app.put("/api/admin/users/:id/block", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID" });

    const targetUser = await storage.getUser(id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if (targetUser.role === "admin") {
      return res.status(403).json({ message: "Cannot block an admin user" });
    }

    const { blockReason, blockedUntil } = req.body;

    const updated = await storage.updateUser(id, {
      isBlocked: true,
      blockReason: blockReason || "Blocked by admin",
      blockedUntil: blockedUntil ? new Date(blockedUntil) : null,
    });

    await storage.createActivityLog(req.user!.id, "user_block", `Blocked user ${targetUser.username}. Reason: ${blockReason || 'No reason'}`);
    return res.json(updated);
  });

  app.put("/api/admin/users/:id/unblock", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID" });

    const targetUser = await storage.getUser(id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const updated = await storage.updateUser(id, {
      isBlocked: false,
      blockReason: null,
      blockedUntil: null,
    });

    await storage.createActivityLog(req.user!.id, "user_unblock", `Unblocked user ${targetUser.username}`);
    return res.json(updated);
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID" });

    const targetUser = await storage.getUser(id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if (targetUser.id === req.user!.id) {
      return res.status(403).json({ message: "Cannot delete your own account from admin panel" });
    }

    if (targetUser.role === "admin") {
      const adminCount = await storage.countAdmins();
      if (adminCount <= 1) {
        return res.status(403).json({ message: "Cannot delete the last admin" });
      }
    }

    await storage.createActivityLog(req.user!.id, "user_delete_admin", `Admin deleted user ${targetUser.username}`);
    await storage.fullDeleteUser(id);
    return res.json({ message: "User deleted" });
  });

  app.get("/api/admin/posts", requireAdmin, async (_req, res) => {
    const allPosts = await storage.getAllPostsAdmin();
    return res.json(allPosts);
  });

  app.put("/api/admin/posts/:id/toggle-hidden", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid post ID" });

    const post = await storage.getPost(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const updated = await storage.togglePostHidden(id, !post.isHidden);
    await storage.createActivityLog(req.user!.id, post.isHidden ? "post_show" : "post_hide", `${post.isHidden ? "Showed" : "Hid"} article: ${post.title}`);
    return res.json(updated);
  });

  app.get("/api/admin/comments", requireAdmin, async (_req, res) => {
    const allComments = await storage.getAllCommentsAdmin();
    return res.json(allComments);
  });

  app.delete("/api/admin/comments/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid comment ID" });
    await storage.deleteComment(id);
    await storage.createActivityLog(req.user!.id, "comment_delete", `Deleted comment #${id}`);
    return res.json({ message: "Comment deleted" });
  });

  app.put("/api/admin/comments/:id/toggle-hidden", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid comment ID" });

    const allComments = await storage.getAllCommentsAdmin();
    const comment = allComments.find(c => c.id === id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const updated = await storage.toggleCommentHidden(id, !comment.isHidden);
    return res.json(updated);
  });

  app.get("/api/admin/reports", requireAdmin, async (req, res) => {
    const status = req.query.status as string | undefined;
    const reportsList = await storage.getReports(status);
    return res.json(reportsList);
  });

  app.put("/api/admin/reports/:id/resolve", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid report ID" });

    const { status } = req.body;
    if (!["resolved", "dismissed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await storage.resolveReport(id, req.user!.id, status);
    if (!updated) return res.status(404).json({ message: "Report not found" });

    await storage.createActivityLog(req.user!.id, "report_resolve", `${status} report #${id}`);
    return res.json(updated);
  });

  app.get("/api/admin/activity-logs", requireAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await storage.getActivityLogs(limit);
    return res.json(logs);
  });

  app.get("/api/auth/providers", (_req, res) => {
    res.json({
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      apple: false,
    });
  });

  return httpServer;
}
