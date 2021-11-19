import { getSignedStreamId } from "../../../src/cfStream"

export async function onRequestGet(context) {
    // Contents of context object
    const {
        request,
        params,
        env,
    } = context

    const { id } = params

    if (id) {
        const res = await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream/live_inputs/${id}`, {
            headers: {
                "Authorization": `Bearer ${env.CF_API_TOKEN_STREAM}`
            }
        })).json()

        return new Response(JSON.stringify(res.result), {headers: {"content-type": "application/json"}})
    } else {
        const url = new URL(request.url)
        const res = await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream/live_inputs?search=${url.searchParams.get("search") || ""}`, {
            headers: {
                "Authorization": `Bearer ${env.CF_API_TOKEN_STREAM}`
            }
        })).json()

        return new Response(JSON.stringify(res.result), {headers: {"content-type": "application/json"}})
    }
}

export async function onRequestPost(context) {
    // Contents of context object
    const {
        env,
        data,
    } = context

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream/live_inputs`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${env.CF_API_TOKEN_STREAM}`
        },
        body: JSON.stringify({
            recording: {
                mode: "automatic", 
                timeoutSeconds: 60,
                requireSignedURLs: true,
                allowedOrigins: [],
            },
            meta: {
                author: data.user.email,
                name: `${data.user.email.split("@")[0]}'s stream`
            }
        })
    })
    
    return res
}

export async function onRequestPatch(context) {
    const {
        request,
        env,
        params,
    } = context

    const body = await request.json()
    const { id } = params

    if (!id) {
        return new Response(null, {status: 400})
    }

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream/live_inputs/${id}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${env.CF_API_TOKEN_STREAM}`
        },
        body: JSON.stringify({
            meta: {
                ...body
            }
        })
    })

    return res
}

export async function onRequestDelete(context) {
    const {
        env,
        params,
    } = context

    const { id } = params

    if (!id) {
        return new Response(null, {status: 400})
    }

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream/live_inputs/${id}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${env.CF_API_TOKEN_STREAM}`
        }
    })

    return res
}
