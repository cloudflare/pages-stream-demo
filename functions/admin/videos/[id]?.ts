import { getSignedStreamId } from "../../../src/cfStream"

export async function onRequestGet(context) {
    // Contents of context object
    const {
        request,     // same as existing Worker API
        env,         // same as existing Worker API
    } = context

    const url = new URL(request.url)
    const res = await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream?search=${url.searchParams.get("search") || ""}`, {
        headers: {
            "Authorization": `Bearer ${env.CF_API_TOKEN_STREAM}`
        }
    })).json()

    const videos = await Promise.all(res.result.map(async x => {
        const signedId = await getSignedStreamId(x.uid, env.CF_STREAM_SIGNING_KEY)
        return {
            ...x,
            signedId,
            thumbnail: `https://videodelivery.net/${signedId}/thumbnails/thumbnail.jpg`,
        }
    }))
    return new Response(JSON.stringify(videos), {headers: {"content-type": "application/json"}})
}

export async function onRequestPost(context) {
    // Contents of context object
    const {
        env,
        data,
    } = context

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream/direct_upload`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${env.CF_API_TOKEN_STREAM}`
        },
        body: JSON.stringify({
            maxDurationSeconds: 21600,
            requireSignedURLs: true,
        })
    })

    const newVideo = await res.json()

    await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream/${newVideo.result.uid}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${env.CF_API_TOKEN_STREAM}`
        },
        body: JSON.stringify({
            meta: {
                modified_by: data.user.email
            }
        })
    })
    
    return new Response(JSON.stringify(newVideo.result), {headers: {"content-type": "application/json"}})
}

export async function onRequestPatch(context) {
    const {
        request,
        env,
        params,
        data,
    } = context

    const body = await request.json()
    const { id } = params

    if (!id) {
        return new Response(null, {status: 400})
    }

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream/${id}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${env.CF_API_TOKEN_STREAM}`
        },
        body: JSON.stringify({
            meta: {
                ...body,
                modified_by: data.user.email
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

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream/${id}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${env.CF_API_TOKEN_STREAM}`
        }
    })

    return res
}
