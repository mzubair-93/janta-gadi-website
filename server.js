require("dotenv").config();

const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA = path.join(ROOT, "data");
const UPLOADS = path.join(ROOT, "uploads");

[DATA, UPLOADS].forEach(p => {
  fs.mkdirSync(p, { recursive: true });
});

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error("Set SESSION_SECRET to at least 32 characters in .env");
  process.exit(1);
}

if (
  !process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD.length < 14 ||
  process.env.ADMIN_PASSWORD.startsWith("replace-")
) {
  console.error("Set a unique ADMIN_PASSWORD of at least 14 characters in .env");
  process.exit(1);
}

const db = new sqlite3.Database(path.join(DATA, "site.sqlite"));

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const defaultContent = {
  businessName: "JANTA GADI KARKHANA",
  location: "Risod, Maharashtra",
  tagline: "Traditional comfort, carefully made.",
  intro: "We make and repair cotton mattresses with care and attention to detail. Contact us to discuss your requirements.",
  about: "JANTA GADI KARKHANA is a local cotton mattress workshop serving customers in and around Risod.",
  phone: "9970551314",
  whatsapp: "+919970551314",
  address: "Risod, Maharashtra, India",
  hours: "Please contact us for working hours.",
  services: [
    {
      title: "Cotton Mattresses",
      description: "Made to suit your preferred size and comfort."
    },
    {
      title: "Mattress Repair",
      description: "Refresh and restore your existing cotton mattress."
    },
    {
      title: "Custom Orders",
      description: "Discuss your requirements directly with our workshop."
    }
  ],
  process: [
    {
      title: "Tell us what you need",
      description: "Share your preferred size and requirements."
    },
    {
      title: "Workshop preparation",
      description: "We prepare the mattress with care."
    },
    {
      title: "Ready for you",
      description: "Contact us to arrange collection or delivery details."
    }
  ],
  gallery: []
};

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK(id=1),
      content TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY CHECK(id=1),
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      must_change INTEGER NOT NULL DEFAULT 1
    )
  `);

  const settingsRow = await get(
    "SELECT id FROM settings WHERE id=1"
  );

  if (!settingsRow) {
    await run(
      "INSERT INTO settings(id,content) VALUES(1,?)",
      [JSON.stringify(defaultContent)]
    );
  }

  const adminRow = await get(
    "SELECT id FROM admins WHERE id=1"
  );

  if (!adminRow) {
    const hash = await bcrypt.hash(
      process.env.ADMIN_PASSWORD,
      12
    );

    await run(
      "INSERT INTO admins(id,username,password_hash,must_change) VALUES(1,?,?,1)",
      [process.env.ADMIN_USERNAME || "owner", hash]
    );

    console.log("Initial admin created.");
  }
}

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null
      }
    }
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

app.use(
  session({
    store: new SQLiteStore({
      db: "sessions.sqlite",
      dir: DATA
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60 * 1000
    }
  })
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Try again later."
  }
});

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS),
  filename: (_req, file, cb) =>
    cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase())
});

const upload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    cb(
      null,
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)
    );
  }
});

function requireAdmin(req, res, next) {
  if (!req.session.adminId) {
    return res.status(401).json({
      error: "Admin login required"
    });
  }

  next();
}

async function readContent() {
  const row = await get(
    "SELECT content FROM settings WHERE id=1"
  );

  return row ? JSON.parse(row.content) : defaultContent;
}

async function saveContent(content) {
  await run(
    `INSERT INTO settings (id, content)
     VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET content=excluded.content`,
    [JSON.stringify(content)]
  );
}
app.get("/api/site", async (_req, res, next) => {
  try {
    res.json(await readContent());
  } catch (err) {
    next(err);
  }
});

app.get("/api/admin/me", (req, res) => {
  res.json({
    authenticated: !!req.session.adminId,
    mustChangePassword: !!req.session.mustChangePassword
  });
});

app.post("/api/admin/login", loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    const admin = await get(
      "SELECT * FROM admins WHERE id=1"
    );

    if (
      !admin ||
      username !== admin.username ||
      typeof password !== "string" ||
      !(await bcrypt.compare(password, admin.password_hash))
    ) {
      return res.status(401).json({
        error: "Invalid username or password"
      });
    }

    req.session.regenerate(err => {
      if (err) {
        return res.status(500).json({
          error: "Could not start secure session"
        });
      }

      req.session.adminId = admin.id;
      req.session.mustChangePassword = !!admin.must_change;

      res.json({
        ok: true,
        mustChangePassword: !!admin.must_change
      });
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.post("/api/admin/password", requireAdmin, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (typeof newPassword !== "string" || newPassword.length < 14) {
      return res.status(400).json({
        error: "Use at least 14 characters for the new password."
      });
    }

    const admin = await get(
      "SELECT * FROM admins WHERE id=1"
    );

    if (
      !admin ||
      !(await bcrypt.compare(currentPassword || "", admin.password_hash))
    ) {
      return res.status(400).json({
        error: "Current password is incorrect."
      });
    }

    const hash = await bcrypt.hash(newPassword, 12);

    await run(
      "UPDATE admins SET password_hash=?,must_change=0 WHERE id=1",
      [hash]
    );

    req.session.mustChangePassword = false;

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.put("/api/admin/site", requireAdmin, async (req, res, next) => {
  try {
    const c = req.body;

    if (
      !c ||
      typeof c !== "object" ||
      typeof c.businessName !== "string" ||
      typeof c.intro !== "string"
    ) {
      return res.status(400).json({
        error: "Invalid site content"
      });
    }

    const clean = {
      ...defaultContent,
      ...c
    };

    clean.services = Array.isArray(c.services) ? c.services.slice(0, 12) : [];
    clean.process = Array.isArray(c.process) ? c.process.slice(0, 8) : [];
    clean.gallery = Array.isArray(c.gallery) ? c.gallery.slice(0, 30) : [];

    await saveContent(clean);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/admin/upload", requireAdmin, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Choose a JPG, PNG, WEBP or GIF image under 5 MB."
      });
    }

    const c = await readContent();

    const item = {
      src: "/uploads/" + req.file.filename,
      alt: String(req.body.alt || "Janta Gadi workshop photo").slice(0, 140)
    };

    c.gallery.push(item);

    await saveContent(c);

    res.json({
      ok: true,
      item
    });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/admin/gallery/:filename", requireAdmin, async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const c = await readContent();

    c.gallery = c.gallery.filter(
      x => path.basename(x.src || "") !== filename
    );

    await saveContent(c);

    const file = path.join(UPLOADS, filename);

    if (file.startsWith(UPLOADS + path.sep) && fs.existsSync(file)) {
      fs.unlinkSync(file);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.use(
  "/uploads",
  express.static(UPLOADS, {
    fallthrough: false,
    dotfiles: "deny"
  })
);

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(ROOT, "public", "admin.html"));
});

app.use(express.static(path.join(ROOT, "public")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(ROOT, "public", "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    error: "Server error"
  });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Janta Gadi site running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });