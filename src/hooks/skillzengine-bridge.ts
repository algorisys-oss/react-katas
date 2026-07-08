/**
 * Bridge SDK to connect react-katas micro-frontend with the parent SkillzEngine app.
 * This runs inside the iframe and communicates completions over HTTP to the parent API.
 */

export async function notifyCompletion(kataId: string) {
  const urlParams = new URLSearchParams(window.location.search);
  const api = urlParams.get("se_api");
  const token = urlParams.get("se_token");
  const pathId = urlParams.get("se_path");

  if (!api || !token || !pathId) {
    console.log("[SkillzEngine Bridge] Not running inside SkillzEngine or missing parameters.");
    return;
  }

  console.log(`[SkillzEngine Bridge] Syncing completion of kata "${kataId}" with SkillzEngine...`);

  try {
    const res = await fetch(`${api}/api/learning/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        pathId,
        kataId,
      }),
    });

    const data = await res.json();
    console.log("[SkillzEngine Bridge] Sync response:", data);

    if (window.parent && window.parent !== window) {
      console.log("[SkillzEngine Bridge] Posting KATA_COMPLETED to parent window...");
      window.parent.postMessage({ type: "KATA_COMPLETED", kataId }, "*");
    }

    return data;
  } catch (err) {
    console.error("[SkillzEngine Bridge] Sync request failed:", err);
  }
}

export async function getRemoteProgress(): Promise<string[] | null> {
  const urlParams = new URLSearchParams(window.location.search);
  const api = urlParams.get("se_api");
  const token = urlParams.get("se_token");
  const pathId = urlParams.get("se_path");

  console.log("[SkillzEngine Bridge] getRemoteProgress parameters:", { api, token, pathId, href: window.location.href });

  if (!api || !token || !pathId) {
    console.log("[SkillzEngine Bridge] Not running inside SkillzEngine or missing parameters.");
    return null;
  }

  try {
    const fetchUrl = `${api}/api/learning/progress?pathId=${pathId}`;
    console.log("[SkillzEngine Bridge] Fetching progress from:", fetchUrl);
    const res = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (data && data.success && data.progress) {
      console.log("[SkillzEngine Bridge] Found completed katas:", data.progress.completed_katas);
      return data.progress.completed_katas || [];
    }
  } catch (err: any) {
    remoteLog(`[SkillzEngine Bridge] Failed to fetch remote progress: ${err?.message || err}`);
    console.error("[SkillzEngine Bridge] Failed to fetch remote progress:", err);
  }
  return null;
}

export async function remoteLog(msg: any) {
  const urlParams = new URLSearchParams(window.location.search);
  const api = urlParams.get("se_api");
  const logStr = typeof msg === "string" ? msg : JSON.stringify(msg);
  if (!api) {
    console.log("[Remote Log Local]:", logStr);
    return;
  }

  try {
    await fetch(`${api}/api/learning/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clientLog: logStr }),
    });
  } catch (err) {
    console.error("Failed to send remote log:", err);
  }
}
