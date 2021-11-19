import { getSignedStreamId } from "../../src/cfStream"

export async function onRequestGet(context) {
    const {
        request,
        env,
        params,
    } = context

    const { id } = params

    if (id) {
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream/${id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${env.CF_API_TOKEN_STREAM}`
            }
        })

        const video = (await res.json()).result

        if (video.meta.visibility !== "public") {
            return new Response(null, {status: 401})
        }

        const signedId = await getSignedStreamId(id, env.CF_STREAM_SIGNING_KEY)

        return new Response(JSON.stringify({
            signedId: `${signedId}`
        }), {
            headers: {
                "content-type": "application/json"
            }
        })
    } else {
        const url = new URL(request.url)
        const res = await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream?search=${url.searchParams.get("search") || ""}`, {
            headers: {
                "Authorization": `Bearer ${env.CF_API_TOKEN_STREAM}`
            }
        })).json()

        const filteredVideos = res.result.filter(x => x.meta.visibility === "public") 
        const videos = await Promise.all(filteredVideos.map(async x => {
            const signedId = await getSignedStreamId(x.uid, env.CF_STREAM_SIGNING_KEY)
            return {
                uid: x.uid,
                status: x.status,
                thumbnail: `https://videodelivery.net/${signedId}/thumbnails/thumbnail.jpg`,
                meta: {
                    name: x.meta.name
                },
                created: x.created,
                modified: x.modified,
                duration: x.duration,
            }
        }))
        return new Response(JSON.stringify(videos), {headers: {"content-type": "application/json"}})
    }
}
