import { createClerkClient } from "@clerk/backend";

// Guards every /api/* route (except auth-related handlers).
// Access control: the signed-in user must have "paper" in their
// Clerk private_metadata.apps (managed via the access manager at
// me.mcky.space). Otherwise → styled 401 with a link back to the portal.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  // Bypass for any /api/auth handlers.
  if (url.pathname.startsWith("/api/auth")) {
    return context.next();
  }

  const clerkClient = createClerkClient({
    secretKey: context.env.CLERK_SECRET_KEY,
    publishableKey: context.env.CLERK_PUBLISHABLE_KEY,
  });

  let state;
  try {
    state = await clerkClient.authenticateRequest(context.request);
  } catch (err) {
    return unauthorized();
  }

  if (state.status !== "signed-in") {
    return unauthorized();
  }

  const auth = state.toAuth();

  // Access check: user must be granted this app (private_metadata.apps).
  try {
    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const apps = clerkUser.privateMetadata && Array.isArray(clerkUser.privateMetadata.apps)
      ? clerkUser.privateMetadata.apps
      : [];
    if (!apps.includes("paper")) {
      return unauthorized();
    }
  } catch (err) {
    // If we cannot resolve the user's access, fail closed.
    return unauthorized();
  }

  context.data = {
    ...(context.data || {}),
    userId: auth.userId,
    sessionId: auth.sessionId,
  };

  return context.next();
}

function unauthorized() {
  // Styled 401 page (glitch theme, mirrors lab htdocs/401.html) with a
  // button back to the mcky portal where access is managed.
  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>401 -- ไม่มีสิทธิ์!</title>
<style>
  @import url("https://fonts.googleapis.com/css2?family=Kanit:wght@700;900&family=Sarabun:wght@400;700&display=swap");
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f0f1a; color: #e0e0e0; font-family: "Sarabun", sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
  .glitch { font-family: "Kanit", sans-serif; font-weight: 900; font-size: clamp(6rem, 22vw, 12rem); line-height: 1; color: #ff3366; text-shadow: 0 0 10px rgba(255,51,102,.5), 0 0 40px rgba(255,51,102,.3); animation: glitch 3s ease-in-out infinite; }
  @keyframes glitch { 0%,90%,100% { transform: translate(0); } 92% { transform: translate(-3px,2px); } 94% { transform: translate(3px,-1px); } 96% { transform: translate(-2px,-2px); } 98% { transform: translate(1px,1px); } }
  .subtitle { font-family: "Kanit", sans-serif; font-weight: 700; font-size: clamp(1.3rem, 4vw, 2.2rem); color: #fff; margin: 1rem 0 .5rem; }
  .description { font-size: 1.1rem; color: #8899aa; margin-bottom: 2rem; line-height: 1.6; }
  .btn { display: inline-block; padding: .9rem 2.5rem; background: linear-gradient(135deg,#ff3366,#ff6633); color: #fff; font-family: "Kanit", sans-serif; font-weight: 700; font-size: 1.1rem; text-decoration: none; border-radius: 50px; transition: all .3s; }
  .btn:hover { transform: scale(1.05); }
</style>
</head>
<body>
  <div style="text-align:center; max-width:640px;">
    <div class="glitch">401</div>
    <div class="subtitle">อ๊ะ! ไม่มีสิทธิ์ใช้งาน Paper</div>
    <div class="description">บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้บริการนี้<br>ติดต่อเจ้าของระบบ หรือกดปุ่มล่างเพื่อกลับไปจัดการสิทธิ์ที่หน้าแรก</div>
    <a href="https://me.mcky.space" class="btn">&#8592; กลับไปหน้าแรก mcky</a>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 401,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}