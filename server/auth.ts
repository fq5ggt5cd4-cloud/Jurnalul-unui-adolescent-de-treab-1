import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import type { Express, Request } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const PgSession = connectPgSimple(session);

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      role: string;
      avatar: string | null;
    }
  }
}

export function setupAuth(app: Express) {
  const sessionStore = new PgSession({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: true,
  });

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "jurnal-secret-key-change-in-prod",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "No account found with this email" });
          }
          if (!user.password) {
            return done(null, false, { message: "This account uses social login. Please use Google to sign in." });
          }

          if (user.isBlocked) {
            if (user.blockedUntil && new Date(user.blockedUntil) > new Date()) {
              return done(null, false, { message: `Your account is blocked until ${user.blockedUntil.toLocaleDateString()}. Reason: ${user.blockReason || 'No reason provided'}` });
            }
            if (!user.blockedUntil) {
              return done(null, false, { message: `Your account has been permanently blocked. Reason: ${user.blockReason || 'No reason provided'}` });
            }
            await storage.updateUser(user.id, { isBlocked: false, blockedUntil: null, blockReason: null });
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Incorrect password" });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const callbackURL = process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback";
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            let user = await storage.getUserByGoogleId(profile.id);
            if (user) {
              if (user.isBlocked) {
                if (user.blockedUntil && new Date(user.blockedUntil) <= new Date()) {
                  await storage.updateUser(user.id, { isBlocked: false, blockedUntil: null, blockReason: null });
                } else if (user.blockedUntil && new Date(user.blockedUntil) > new Date()) {
                  return done(null, false, { message: `Your account is blocked until ${user.blockedUntil.toLocaleDateString()}. Reason: ${user.blockReason || 'No reason provided'}` } as any);
                } else {
                  return done(null, false, { message: `Your account has been permanently blocked. Reason: ${user.blockReason || 'No reason provided'}` } as any);
                }
              }
              return done(null, user);
            }
            const email = profile.emails?.[0]?.value;
            if (email) {
              user = await storage.getUserByEmail(email);
              if (user) {
                if (user.isBlocked) {
                  if (user.blockedUntil && new Date(user.blockedUntil) <= new Date()) {
                    await storage.updateUser(user.id, { isBlocked: false, blockedUntil: null, blockReason: null });
                  } else if (user.blockedUntil && new Date(user.blockedUntil) > new Date()) {
                    return done(null, false, { message: `Your account is blocked until ${user.blockedUntil.toLocaleDateString()}. Reason: ${user.blockReason || 'No reason provided'}` } as any);
                  } else {
                    return done(null, false, { message: `Your account has been permanently blocked. Reason: ${user.blockReason || 'No reason provided'}` } as any);
                  }
                }
                return done(null, user);
              }
            }
            user = await storage.createUser({
              username: profile.displayName || `user_${profile.id}`,
              email: email || `${profile.id}@google.oauth`,
              password: null,
              role: "user",
              avatar: profile.photos?.[0]?.value || null,
              googleId: profile.id,
              appleId: null,
            });
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      });
    } catch (err) {
      done(err);
    }
  });
}

export function requireAuth(req: Request, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function requireAdmin(req: Request, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function requireNotBlocked(req: Request, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const user = await storage.getUser(req.user!.id);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }
  if (user.isBlocked) {
    if (user.blockedUntil && new Date(user.blockedUntil) <= new Date()) {
      await storage.updateUser(user.id, { isBlocked: false, blockedUntil: null, blockReason: null });
      return next();
    }
    return res.status(403).json({ message: `Your account is blocked. Reason: ${user.blockReason || 'No reason provided'}` });
  }
  next();
}
