// public/form.js

// Helpers
function setAlert(el, type, msg) {
  if (!el) return;
  el.className = `alert ${type}`; // .alert.success or .alert.error from CSS
  el.textContent = msg || '';
}

export function attachLogin() {
  const form = document.getElementById('loginForm');
  const alertEl = document.getElementById('loginAlert');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setAlert(alertEl, 'info', 'Signing you in...');

    const body = {
      email: form.email.value.trim(),
      password: form.password.value
    };

    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await resp.json();

      if (data.ok) {
        setAlert(alertEl, 'success', 'Logged in! Redirecting…');
        window.location.href = '/dashboard';
      } else {
        setAlert(alertEl, 'error', data.message || 'Invalid credentials');
      }
    } catch (err) {
      setAlert(alertEl, 'error', 'Network error. Please try again.');
    }
  });
}

export function attachRegister() {
  const form = document.getElementById('registerForm');
  const alertEl = document.getElementById('registerAlert');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setAlert(alertEl, 'info', 'Creating your account...');

    const body = {
      full_name: form.full_name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      course: form.course.value.trim(),
      semester: form.semester.value,
      password: form.password.value
    };

    try {
      const resp = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await resp.json();

      if (data.ok) {
        setAlert(alertEl, 'success', 'Account created! Redirecting to login…');
        setTimeout(() => (window.location.href = '/login'), 1000);
      } else {
        setAlert(alertEl, 'error', data.message || 'Could not register');
      }
    } catch (err) {
      setAlert(alertEl, 'error', 'Network error. Please try again.');
    }
  });
}

export async function attachLogout(buttonId = 'logoutBtn') {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/login';
  });
}
