const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const db = require("./database");

dotenv.config();

const app = express();
const PORT = 3000;

// Read form data
app.use(express.urlencoded({ extended: true }));

// Login session
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
        }
    })
);

// Location of your main portfolio folder
const portfolioFolder = path.join(__dirname, "..");


// Show login page
app.get("/admin-login.html", (req, res) => {
    res.sendFile(path.join(portfolioFolder, "admin-login.html"));
});

// Process login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.send(`
            <script>
                alert("Please enter your email and password.");
                window.location.href = "/admin-login.html";
            </script>
        `);
    }

    const emailCorrect =
        email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

    const passwordCorrect = await bcrypt.compare(
        password,
        process.env.ADMIN_PASSWORD_HASH
    );

    if (!emailCorrect || !passwordCorrect) {
        return res.send(`
            <script>
                alert("Incorrect email or password.");
                window.location.href = "/admin-login.html";
            </script>
        `);
    }

    req.session.isAdmin = true;

    res.redirect("/admin.html");
});

// Logout
app.get("/admin.html", (req, res) => {
    if (!req.session.isAdmin) {
        return res.redirect("/admin-login.html");
    }

    const adminFile = path.join(portfolioFolder, "admin.html");

    let html = fs.readFileSync(adminFile, "utf8");

    // Get message statistics
    const totalMessages = db
        .prepare("SELECT COUNT(*) AS count FROM messages")
        .get().count;

    const unreadMessages = db
        .prepare("SELECT COUNT(*) AS count FROM messages WHERE is_read = 0")
        .get().count;

    const readMessages = db
        .prepare("SELECT COUNT(*) AS count FROM messages WHERE is_read = 1")
        .get().count;

    // Get messages
    const messages = db
        .prepare("SELECT * FROM messages ORDER BY created_at DESC")
        .all();

    // Create the message cards
    let messageCards = "";

    if (messages.length === 0) {

        messageCards = `
            <div class="message-card">
                <p class="message-text">
                    No messages yet.
                </p>
            </div>
        `;

    } else {

        messageCards = messages.map((msg) => {

            const initial = msg.name
                .charAt(0)
                .toUpperCase();

            const statusClass = msg.is_read
                ? "read"
                : "unread";

            const statusText = msg.is_read
                ? "Read"
                : "Unread";

            return `
                <div class="message-card">

                    <div class="message-top">

                        <div class="user-info">

                            <div class="user-icon">
                                ${initial}
                            </div>

                            <div>
                                <h3>${escapeHtml(msg.name)}</h3>
                                <p>${escapeHtml(msg.email)}</p>
                            </div>

                        </div>

                        <span class="${statusClass}">
                            ${statusText}
                        </span>

                    </div>

                    <p class="message-text">
                        ${escapeHtml(msg.message)}
                    </p>

                    <div class="message-bottom">

    <span>
        ${msg.created_at}
    </span>

    <div class="message-buttons">

    ${
        msg.is_read
            ? ""
            : `
                <form action="/messages/${msg.id}/read" method="POST">
                    <button type="submit" class="read-btn">
                        Mark as Read
                    </button>
                </form>
            `
    }

                <form action="/messages/${msg.id}/delete" method="POST">
                     <button type="submit" class="delete-btn">
                      Delete
                     </button>
                   </form>

                  </div>

                 </div>

                </div>  

                
            `;

        }).join("");
    }

    // Replace the placeholders in admin.html
    html = html.replace(
        "<!-- TOTAL_MESSAGES -->",
        totalMessages
    );

    html = html.replace(
        "<!-- UNREAD_MESSAGES -->",
        unreadMessages
    );

    html = html.replace(
        "<!-- READ_MESSAGES -->",
        readMessages
    );

    html = html.replace(
        "<!-- MESSAGE_CARDS -->",
        messageCards
    );

    res.send(html);
});

// Serve the rest of your portfolio
app.use(express.static(portfolioFolder));

// Receive portfolio contact form messages
app.post("/messages", (req, res) => {
    const { name, email, subject, message } = req.body;

    // Make sure all fields are filled
    if (!name || !email || !subject || !message) {
        return res.status(400).send(`
            <script>
                alert("Please fill in all fields.");
                window.history.back();
            </script>
        `);
    }

    try {
        const insert = db.prepare(`
            INSERT INTO messages (name, email, subject, message)
            VALUES (?, ?, ?, ?)
        `);

        insert.run(name, email, subject, message);

        res.send(`
            <script>
                alert("Message sent successfully!");
                window.location.href = "/index.html#contact";
            </script>
        `);

    } catch (error) {
        console.error("Error saving message:", error);

        res.status(500).send(`
            <script>
                alert("Something went wrong. Please try again.");
                window.history.back();
            </script>
        `);
    }
});

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
// Mark a message as read
app.post("/messages/:id/read", (req, res) => {
    if (!req.session.isAdmin) {
        return res.redirect("/admin-login.html");
    }

    db.prepare(`
        UPDATE messages
        SET is_read = 1
        WHERE id = ?
    `).run(req.params.id);

    res.redirect("/admin.html");
});
// Delete one message
app.post("/messages/:id/delete", (req, res) => {

    if (!req.session.isAdmin) {
        return res.redirect("/admin-login.html");
    }

    db.prepare(`
        DELETE FROM messages
        WHERE id = ?
    `).run(req.params.id);

    res.redirect("/admin.html");
});

app.listen(PORT, () => {
    console.log(`Admin server running at http://localhost:${PORT}`);
});