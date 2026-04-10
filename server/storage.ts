import { db } from "./db";
import { eq, desc, and, ilike, or, sql, count, ne, isNull, gt, lte, inArray } from "drizzle-orm";
import {
  users, posts, comments, forumTopics, forumReplies, qas, reports, activityLogs, reactions, notifications,
  type User, type InsertUser,
  type Post, type InsertPost,
  type Comment, type InsertComment,
  type ForumTopic, type InsertForumTopic,
  type ForumReply, type InsertForumReply,
  type QA, type InsertQA,
  type Report, type InsertReport,
  type ActivityLog, type Reaction, type Notification,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  countAdmins(): Promise<number>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;
  getPostsByAuthor(authorId: number): Promise<(Post & { authorName: string })[]>;
  getForumTopicsByAuthor(authorId: number): Promise<(ForumTopic & { authorName: string })[]>;
  getForumRepliesByAuthor(authorId: number): Promise<(ForumReply & { authorName: string })[]>;
  anonymizeUserContent(userId: number, deletedLabel: string): Promise<void>;
  fullDeleteUser(userId: number): Promise<void>;

  getPosts(category?: string): Promise<(Post & { authorName: string })[]>;
  getAllPostsAdmin(): Promise<(Post & { authorName: string })[]>;
  getPost(id: number): Promise<(Post & { authorName: string }) | undefined>;
  getLatestPosts(limit?: number): Promise<(Post & { authorName: string })[]>;
  createPost(post: InsertPost & { authorId: number }): Promise<Post>;
  updatePost(id: number, data: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: number): Promise<void>;
  togglePostHidden(id: number, hidden: boolean): Promise<Post | undefined>;

  getCommentsByPost(postId: number): Promise<(Comment & { authorName: string })[]>;
  getAllCommentsAdmin(): Promise<(Comment & { authorName: string; postTitle: string })[]>;
  getComment(id: number): Promise<Comment | undefined>;
  createComment(comment: InsertComment & { authorId: number }): Promise<Comment>;
  deleteComment(id: number): Promise<void>;
  toggleCommentHidden(id: number, hidden: boolean): Promise<Comment | undefined>;

  getForumTopics(categoryId?: string): Promise<(ForumTopic & { authorName: string; replyCount: number })[]>;
  getForumTopic(id: number): Promise<(ForumTopic & { authorName: string }) | undefined>;
  createForumTopic(topic: InsertForumTopic & { authorId: number }): Promise<ForumTopic>;
  deleteForumTopic(id: number): Promise<void>;
  toggleForumTopicHidden(id: number, hidden: boolean): Promise<ForumTopic | undefined>;
  getForumReplies(topicId: number): Promise<(ForumReply & { authorName: string })[]>;
  getForumReply(id: number): Promise<ForumReply | undefined>;
  createForumReply(reply: InsertForumReply & { authorId: number }): Promise<ForumReply>;
  deleteForumReply(id: number): Promise<void>;
  toggleForumReplyHidden(id: number, hidden: boolean): Promise<ForumReply | undefined>;

  getQAs(userId?: number, isAdmin?: boolean): Promise<QA[]>;
  approveQA(id: number): Promise<QA | undefined>;
  rejectQA(id: number): Promise<void>;
  getQA(id: number): Promise<QA | undefined>;
  createQA(qa: InsertQA & { authorId?: number | null }): Promise<QA>;
  answerQA(id: number, answer: string): Promise<QA | undefined>;
  deleteQA(id: number): Promise<void>;

  createReport(report: InsertReport & { reporterId: number }): Promise<Report>;
  getReports(status?: string): Promise<(Report & { reporterName: string })[]>;
  getReport(id: number): Promise<Report | undefined>;
  resolveReport(id: number, resolvedBy: number, status: string): Promise<Report | undefined>;
  getPendingReportCount(): Promise<number>;

  createActivityLog(userId: number | null, action: string, details?: string): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<(ActivityLog & { username: string | null })[]>;

  getStats(): Promise<{ users: number; posts: number; comments: number; reports: number; forumTopics: number }>;
  exportUserData(userId: number): Promise<any>;

  toggleReaction(userId: number, contentType: string, contentId: number, type: string): Promise<{ action: string }>;
  getReactionCounts(contentType: string, contentId: number): Promise<{ likes: number; dislikes: number }>;
  getReactionCountsBatch(contentType: string, contentIds: number[]): Promise<Record<number, { likes: number; dislikes: number }>>;

  createNotificationsForAdmins(type: string, title: string, message: string, contentType?: string, contentId?: number): Promise<void>;
  getNotificationsForAdmin(adminId: number, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(adminId: number): Promise<number>;
  markNotificationRead(notificationId: number, adminId: number): Promise<void>;
  markAllNotificationsRead(adminId: number): Promise<void>;
  getUserReaction(userId: number, contentType: string, contentId: number): Promise<string | null>;
  getUserReactionsBatch(userId: number, contentType: string, contentIds: number[]): Promise<Record<number, string>>;

  incrementPostViews(postId: number): Promise<void>;
  incrementPostShares(postId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async countAdmins(): Promise<number> {
    const result = await db.select({ value: count() }).from(users).where(eq(users.role, "admin"));
    return result[0].value;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async searchUsers(query: string): Promise<User[]> {
    return db.select().from(users).where(
      or(
        ilike(users.username, `%${query}%`),
        ilike(users.email, `%${query}%`)
      )
    ).orderBy(desc(users.createdAt));
  }

  async getPostsByAuthor(authorId: number): Promise<(Post & { authorName: string })[]> {
    return db
      .select({
        id: posts.id, title: posts.title, content: posts.content,
        authorId: posts.authorId, category: posts.category, likes: posts.likes,
        views: posts.views, shares: posts.shares,
        isHidden: posts.isHidden, createdAt: posts.createdAt, authorName: users.username,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.authorId, authorId))
      .orderBy(desc(posts.createdAt));
  }

  async getForumTopicsByAuthor(authorId: number): Promise<(ForumTopic & { authorName: string })[]> {
    return db
      .select({
        id: forumTopics.id, title: forumTopics.title, categoryId: forumTopics.categoryId,
        authorId: forumTopics.authorId, isHidden: forumTopics.isHidden,
        createdAt: forumTopics.createdAt, authorName: users.username,
      })
      .from(forumTopics)
      .innerJoin(users, eq(forumTopics.authorId, users.id))
      .where(eq(forumTopics.authorId, authorId))
      .orderBy(desc(forumTopics.createdAt));
  }

  async getForumRepliesByAuthor(authorId: number): Promise<(ForumReply & { authorName: string })[]> {
    return db
      .select({
        id: forumReplies.id, topicId: forumReplies.topicId, authorId: forumReplies.authorId,
        content: forumReplies.content, isHidden: forumReplies.isHidden,
        createdAt: forumReplies.createdAt, authorName: users.username,
      })
      .from(forumReplies)
      .innerJoin(users, eq(forumReplies.authorId, users.id))
      .where(eq(forumReplies.authorId, authorId))
      .orderBy(desc(forumReplies.createdAt));
  }

  async anonymizeUserContent(userId: number, deletedLabel: string): Promise<void> {
    await db.update(users).set({
      username: deletedLabel, email: `deleted_${userId}@deleted.local`,
      password: null, avatar: null, googleId: null, appleId: null,
    }).where(eq(users.id, userId));
  }

  async fullDeleteUser(userId: number): Promise<void> {
    await db.delete(forumReplies).where(eq(forumReplies.authorId, userId));
    await db.delete(comments).where(eq(comments.authorId, userId));
    await db.delete(reports).where(eq(reports.reporterId, userId));
    await db.delete(activityLogs).where(eq(activityLogs.userId, userId));
    const userTopics = await db.select({ id: forumTopics.id }).from(forumTopics).where(eq(forumTopics.authorId, userId));
    for (const topic of userTopics) {
      await db.delete(forumReplies).where(eq(forumReplies.topicId, topic.id));
    }
    await db.delete(forumTopics).where(eq(forumTopics.authorId, userId));
    const userPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.authorId, userId));
    for (const post of userPosts) {
      await db.delete(comments).where(eq(comments.postId, post.id));
    }
    await db.delete(posts).where(eq(posts.authorId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }

  async getPosts(category?: string): Promise<(Post & { authorName: string })[]> {
    return db
      .select({
        id: posts.id, title: posts.title, content: posts.content,
        authorId: posts.authorId, category: posts.category, likes: posts.likes,
        views: posts.views, shares: posts.shares,
        isHidden: posts.isHidden, createdAt: posts.createdAt, authorName: users.username,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(category ? and(eq(posts.category, category), eq(posts.isHidden, false)) : eq(posts.isHidden, false))
      .orderBy(desc(posts.createdAt));
  }

  async getAllPostsAdmin(): Promise<(Post & { authorName: string })[]> {
    return db
      .select({
        id: posts.id, title: posts.title, content: posts.content,
        authorId: posts.authorId, category: posts.category, likes: posts.likes,
        views: posts.views, shares: posts.shares,
        isHidden: posts.isHidden, createdAt: posts.createdAt, authorName: users.username,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt));
  }

  async getPost(id: number): Promise<(Post & { authorName: string }) | undefined> {
    const [post] = await db
      .select({
        id: posts.id, title: posts.title, content: posts.content,
        authorId: posts.authorId, category: posts.category, likes: posts.likes,
        views: posts.views, shares: posts.shares,
        isHidden: posts.isHidden, createdAt: posts.createdAt, authorName: users.username,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.id, id));
    return post;
  }

  async getLatestPosts(limit = 6): Promise<(Post & { authorName: string })[]> {
    return db
      .select({
        id: posts.id, title: posts.title, content: posts.content,
        authorId: posts.authorId, category: posts.category, likes: posts.likes,
        views: posts.views, shares: posts.shares,
        isHidden: posts.isHidden, createdAt: posts.createdAt, authorName: users.username,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.isHidden, false))
      .orderBy(desc(posts.createdAt))
      .limit(limit);
  }

  async createPost(post: InsertPost & { authorId: number }): Promise<Post> {
    const [created] = await db.insert(posts).values(post).returning();
    return created;
  }

  async updatePost(id: number, data: Partial<InsertPost>): Promise<Post | undefined> {
    const [updated] = await db.update(posts).set(data).where(eq(posts.id, id)).returning();
    return updated;
  }

  async deletePost(id: number): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  async togglePostHidden(id: number, hidden: boolean): Promise<Post | undefined> {
    const [updated] = await db.update(posts).set({ isHidden: hidden }).where(eq(posts.id, id)).returning();
    return updated;
  }

  async getCommentsByPost(postId: number): Promise<(Comment & { authorName: string })[]> {
    return db
      .select({
        id: comments.id, postId: comments.postId, authorId: comments.authorId,
        content: comments.content, isHidden: comments.isHidden,
        createdAt: comments.createdAt, authorName: users.username,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));
  }

  async getAllCommentsAdmin(): Promise<(Comment & { authorName: string; postTitle: string })[]> {
    return db
      .select({
        id: comments.id, postId: comments.postId, authorId: comments.authorId,
        content: comments.content, isHidden: comments.isHidden,
        createdAt: comments.createdAt, authorName: users.username, postTitle: posts.title,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .innerJoin(posts, eq(comments.postId, posts.id))
      .orderBy(desc(comments.createdAt));
  }

  async getComment(id: number): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment;
  }

  async createComment(comment: InsertComment & { authorId: number }): Promise<Comment> {
    const [created] = await db.insert(comments).values(comment).returning();
    return created;
  }

  async deleteComment(id: number): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  async toggleCommentHidden(id: number, hidden: boolean): Promise<Comment | undefined> {
    const [updated] = await db.update(comments).set({ isHidden: hidden }).where(eq(comments.id, id)).returning();
    return updated;
  }

  async getForumTopics(categoryId?: string): Promise<(ForumTopic & { authorName: string; replyCount: number })[]> {
    const topicsList = await db
      .select({
        id: forumTopics.id, title: forumTopics.title, categoryId: forumTopics.categoryId,
        authorId: forumTopics.authorId, isHidden: forumTopics.isHidden,
        createdAt: forumTopics.createdAt, authorName: users.username,
      })
      .from(forumTopics)
      .innerJoin(users, eq(forumTopics.authorId, users.id))
      .where(categoryId ? and(eq(forumTopics.categoryId, categoryId), eq(forumTopics.isHidden, false)) : eq(forumTopics.isHidden, false))
      .orderBy(desc(forumTopics.createdAt));

    const withReplyCounts = await Promise.all(
      topicsList.map(async (topic) => {
        const replies = await db
          .select({ id: forumReplies.id })
          .from(forumReplies)
          .where(eq(forumReplies.topicId, topic.id));
        return { ...topic, replyCount: replies.length };
      })
    );

    return withReplyCounts;
  }

  async getForumTopic(id: number): Promise<(ForumTopic & { authorName: string }) | undefined> {
    const [topic] = await db
      .select({
        id: forumTopics.id, title: forumTopics.title, categoryId: forumTopics.categoryId,
        authorId: forumTopics.authorId, isHidden: forumTopics.isHidden,
        createdAt: forumTopics.createdAt, authorName: users.username,
      })
      .from(forumTopics)
      .innerJoin(users, eq(forumTopics.authorId, users.id))
      .where(eq(forumTopics.id, id));
    return topic;
  }

  async createForumTopic(topic: InsertForumTopic & { authorId: number }): Promise<ForumTopic> {
    const [created] = await db.insert(forumTopics).values(topic).returning();
    return created;
  }

  async deleteForumTopic(id: number): Promise<void> {
    await db.delete(forumTopics).where(eq(forumTopics.id, id));
  }

  async toggleForumTopicHidden(id: number, hidden: boolean): Promise<ForumTopic | undefined> {
    const [updated] = await db.update(forumTopics).set({ isHidden: hidden }).where(eq(forumTopics.id, id)).returning();
    return updated;
  }

  async getForumReplies(topicId: number): Promise<(ForumReply & { authorName: string })[]> {
    return db
      .select({
        id: forumReplies.id, topicId: forumReplies.topicId, authorId: forumReplies.authorId,
        content: forumReplies.content, isHidden: forumReplies.isHidden,
        createdAt: forumReplies.createdAt, authorName: users.username,
      })
      .from(forumReplies)
      .innerJoin(users, eq(forumReplies.authorId, users.id))
      .where(eq(forumReplies.topicId, topicId))
      .orderBy(forumReplies.createdAt);
  }

  async getForumReply(id: number): Promise<ForumReply | undefined> {
    const [reply] = await db.select().from(forumReplies).where(eq(forumReplies.id, id));
    return reply;
  }

  async createForumReply(reply: InsertForumReply & { authorId: number }): Promise<ForumReply> {
    const [created] = await db.insert(forumReplies).values(reply).returning();
    return created;
  }

  async deleteForumReply(id: number): Promise<void> {
    await db.delete(forumReplies).where(eq(forumReplies.id, id));
  }

  async toggleForumReplyHidden(id: number, hidden: boolean): Promise<ForumReply | undefined> {
    const [updated] = await db.update(forumReplies).set({ isHidden: hidden }).where(eq(forumReplies.id, id)).returning();
    return updated;
  }

  async getQAs(userId?: number, isAdmin?: boolean): Promise<QA[]> {
    if (isAdmin) {
      return db.select().from(qas).orderBy(desc(qas.createdAt));
    }
    if (userId) {
      return db.select().from(qas)
        .where(or(eq(qas.isApproved, true), eq(qas.authorId, userId)))
        .orderBy(desc(qas.createdAt));
    }
    return db.select().from(qas).where(eq(qas.isApproved, true)).orderBy(desc(qas.createdAt));
  }

  async approveQA(id: number): Promise<QA | undefined> {
    const [updated] = await db.update(qas).set({ isApproved: true }).where(eq(qas.id, id)).returning();
    return updated;
  }

  async rejectQA(id: number): Promise<void> {
    await db.delete(qas).where(eq(qas.id, id));
  }

  async createQA(qa: InsertQA & { authorId?: number | null }): Promise<QA> {
    const [created] = await db.insert(qas).values(qa).returning();
    return created;
  }

  async getQA(id: number): Promise<QA | undefined> {
    const [qa] = await db.select().from(qas).where(eq(qas.id, id));
    return qa;
  }

  async answerQA(id: number, answer: string): Promise<QA | undefined> {
    const [updated] = await db
      .update(qas)
      .set({ answer, isAnswered: true })
      .where(eq(qas.id, id))
      .returning();
    return updated;
  }

  async deleteQA(id: number): Promise<void> {
    await db.delete(qas).where(eq(qas.id, id));
  }

  async createReport(report: InsertReport & { reporterId: number }): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }

  async getReports(status?: string): Promise<(Report & { reporterName: string })[]> {
    const result = await db
      .select({
        id: reports.id, reporterId: reports.reporterId, contentType: reports.contentType,
        contentId: reports.contentId, reason: reports.reason, status: reports.status,
        resolvedBy: reports.resolvedBy, resolvedAt: reports.resolvedAt,
        createdAt: reports.createdAt, reporterName: users.username,
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(status ? eq(reports.status, status) : undefined)
      .orderBy(desc(reports.createdAt));
    return result;
  }

  async getReport(id: number): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async resolveReport(id: number, resolvedBy: number, status: string): Promise<Report | undefined> {
    const [updated] = await db.update(reports).set({
      status, resolvedBy, resolvedAt: new Date(),
    }).where(eq(reports.id, id)).returning();
    return updated;
  }

  async getPendingReportCount(): Promise<number> {
    const result = await db.select({ value: count() }).from(reports).where(eq(reports.status, "pending"));
    return result[0].value;
  }

  async createActivityLog(userId: number | null, action: string, details?: string): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs).values({
      userId, action, details,
    }).returning();
    return created;
  }

  async getActivityLogs(limit = 100): Promise<(ActivityLog & { username: string | null })[]> {
    const result = await db
      .select({
        id: activityLogs.id, userId: activityLogs.userId, action: activityLogs.action,
        details: activityLogs.details, createdAt: activityLogs.createdAt,
        username: users.username,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
    return result;
  }

  async getStats(): Promise<{ users: number; posts: number; comments: number; reports: number; forumTopics: number }> {
    const [u] = await db.select({ value: count() }).from(users);
    const [p] = await db.select({ value: count() }).from(posts);
    const [c] = await db.select({ value: count() }).from(comments);
    const [r] = await db.select({ value: count() }).from(reports).where(eq(reports.status, "pending"));
    const [f] = await db.select({ value: count() }).from(forumTopics);
    return { users: u.value, posts: p.value, comments: c.value, reports: r.value, forumTopics: f.value };
  }

  async exportUserData(userId: number): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) return null;

    const userPosts = await this.getPostsByAuthor(userId);
    const userComments = await db.select().from(comments).where(eq(comments.authorId, userId));
    const userForumTopics = await this.getForumTopicsByAuthor(userId);
    const userForumReplies = await this.getForumRepliesByAuthor(userId);
    const userQAs = await db.select().from(qas).where(eq(qas.authorId, userId));

    return {
      account: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        acceptedTerms: user.acceptedTerms,
        termsAcceptedAt: user.termsAcceptedAt,
      },
      posts: userPosts,
      comments: userComments,
      forumTopics: userForumTopics,
      forumReplies: userForumReplies,
      questions: userQAs,
      exportedAt: new Date().toISOString(),
    };
  }

  async toggleReaction(userId: number, contentType: string, contentId: number, type: string): Promise<{ action: string }> {
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(reactions)
        .where(and(eq(reactions.userId, userId), eq(reactions.contentType, contentType), eq(reactions.contentId, contentId)));

      if (existing.length > 0) {
        const current = existing[0];
        if (current.type === type) {
          await tx.delete(reactions).where(eq(reactions.id, current.id));
          return { action: "removed" };
        } else {
          await tx.update(reactions).set({ type }).where(eq(reactions.id, current.id));
          return { action: "switched" };
        }
      } else {
        await tx.insert(reactions).values({ userId, contentType, contentId, type });
        return { action: "added" };
      }
    });
  }

  async getReactionCounts(contentType: string, contentId: number): Promise<{ likes: number; dislikes: number }> {
    const rows = await db.select({ type: reactions.type, count: count() }).from(reactions)
      .where(and(eq(reactions.contentType, contentType), eq(reactions.contentId, contentId)))
      .groupBy(reactions.type);
    let likes = 0, dislikes = 0;
    for (const r of rows) {
      if (r.type === "like") likes = r.count;
      if (r.type === "dislike") dislikes = r.count;
    }
    return { likes, dislikes };
  }

  async getReactionCountsBatch(contentType: string, contentIds: number[]): Promise<Record<number, { likes: number; dislikes: number }>> {
    if (contentIds.length === 0) return {};
    const rows = await db.select({
      contentId: reactions.contentId,
      type: reactions.type,
      count: count(),
    }).from(reactions)
      .where(and(eq(reactions.contentType, contentType), inArray(reactions.contentId, contentIds)))
      .groupBy(reactions.contentId, reactions.type);

    const result: Record<number, { likes: number; dislikes: number }> = {};
    for (const id of contentIds) {
      result[id] = { likes: 0, dislikes: 0 };
    }
    for (const r of rows) {
      if (!result[r.contentId]) result[r.contentId] = { likes: 0, dislikes: 0 };
      if (r.type === "like") result[r.contentId].likes = r.count;
      if (r.type === "dislike") result[r.contentId].dislikes = r.count;
    }
    return result;
  }

  async getUserReaction(userId: number, contentType: string, contentId: number): Promise<string | null> {
    const [row] = await db.select().from(reactions)
      .where(and(eq(reactions.userId, userId), eq(reactions.contentType, contentType), eq(reactions.contentId, contentId)));
    return row?.type || null;
  }

  async getUserReactionsBatch(userId: number, contentType: string, contentIds: number[]): Promise<Record<number, string>> {
    if (contentIds.length === 0) return {};
    const rows = await db.select().from(reactions)
      .where(and(eq(reactions.userId, userId), eq(reactions.contentType, contentType), inArray(reactions.contentId, contentIds)));
    const result: Record<number, string> = {};
    for (const r of rows) {
      result[r.contentId] = r.type;
    }
    return result;
  }

  async incrementPostViews(postId: number): Promise<void> {
    await db.update(posts).set({ views: sql`${posts.views} + 1` }).where(eq(posts.id, postId));
  }

  async incrementPostShares(postId: number): Promise<void> {
    await db.update(posts).set({ shares: sql`${posts.shares} + 1` }).where(eq(posts.id, postId));
  }

  async createNotificationsForAdmins(type: string, title: string, message: string, contentType?: string, contentId?: number): Promise<void> {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    if (admins.length === 0) return;
    await db.insert(notifications).values(
      admins.map((a) => ({
        adminId: a.id,
        type,
        title,
        message,
        contentType: contentType ?? null,
        contentId: contentId ?? null,
        isRead: false,
      }))
    );
  }

  async getNotificationsForAdmin(adminId: number, limit = 50): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.adminId, adminId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(adminId: number): Promise<number> {
    const [r] = await db.select({ count: count() }).from(notifications)
      .where(and(eq(notifications.adminId, adminId), eq(notifications.isRead, false)));
    return r?.count ?? 0;
  }

  async markNotificationRead(notificationId: number, adminId: number): Promise<void> {
    await db.update(notifications).set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.adminId, adminId)));
  }

  async markAllNotificationsRead(adminId: number): Promise<void> {
    await db.update(notifications).set({ isRead: true })
      .where(eq(notifications.adminId, adminId));
  }
}

export const storage = new DatabaseStorage();
