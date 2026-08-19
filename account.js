// GET  /api/account?username=<name>  — fetch a user's game state
// POST /api/account                  — create or update a user's game state

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const username = url.searchParams.get("username");

  if (!username) {
    return Response.json({ error: "Missing username parameter" }, { status: 400 });
  }

  try {
    const data = await context.env.CITY_DATA.get(`account:${username}`);
    if (!data) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }
    return Response.json(JSON.parse(data));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const username = body.username;

    if (!username) {
      return Response.json({ error: "Missing username in body" }, { status: 400 });
    }

    await context.env.CITY_DATA.put(`account:${username}`, JSON.stringify(body));
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
