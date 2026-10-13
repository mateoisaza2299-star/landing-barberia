import { supabase } from "./supabase.js";

const form = document.querySelector("[data-login]");
const errorBox = document.querySelector("[data-login-error]");
const submit = document.querySelector("[data-login-submit]");

const fail = (message) => {
  errorBox.hidden = !message;
  errorBox.textContent = message || "";
};

const isAdmin = async () => {
  const { data, error } = await supabase.from("admins").select("id").limit(1);
  return !error && Array.isArray(data) && data.length > 0;
};

const gate = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && await isAdmin()) window.location.replace("admin.html");
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  fail("");
  const data = new FormData(form);
  submit.disabled = true;
  submit.textContent = "Entrando…";
  const { error } = await supabase.auth.signInWithPassword({
    email: String(data.get("email") || "").trim(),
    password: String(data.get("password") || "")
  });
  if (error) {
    submit.disabled = false;
    submit.textContent = "Entrar";
    fail("Correo o contraseña incorrectos.");
    return;
  }
  if (!(await isAdmin())) {
    await supabase.auth.signOut();
    submit.disabled = false;
    submit.textContent = "Entrar";
    fail("Esta cuenta no tiene acceso al panel.");
    return;
  }
  window.location.replace("admin.html");
});

gate();
