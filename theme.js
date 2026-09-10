const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const themeText = document.getElementById("theme-text");

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);

    if (theme === "light") {
        themeIcon.textContent = "🌙";
        themeText.textContent = "Dark";
    } else {
        themeIcon.textContent = "☀️";
        themeText.textContent = "Light";
    }
}

const savedTheme = localStorage.getItem("admin-theme") || "dark";

applyTheme(savedTheme);

themeToggle.addEventListener("click", () => {
    const currentTheme =
        document.documentElement.getAttribute("data-theme");

    const newTheme =
        currentTheme === "dark" ? "light" : "dark";

    localStorage.setItem("admin-theme", newTheme);

    applyTheme(newTheme);
});