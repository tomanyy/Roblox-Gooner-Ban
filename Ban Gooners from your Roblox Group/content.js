chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === "CHECK_MEMBERS") {
        chrome.storage.local.get(["groupIds", "autoKick"], async function(result) {
            if (!result.autoKick) return;

            for (let groupId of result.groupIds) {
                await processGroup(groupId);
            }
        });
    }
});

async function processGroup(groupId) {
    // Verify owner
    const userResponse = await fetch("https://users.roblox.com/v1/users/authenticated", { credentials: "include" });
    const userData = await userResponse.json();
    const userId = userData.id;

    const groupResponse = await fetch(`https://groups.roblox.com/v1/groups/${groupId}`);
    const groupData = await groupResponse.json();

    if (!groupData.owner || groupData.owner.userId !== userId) {
        console.warn(`❌ User is NOT the owner of group ${groupId}.`);
        return;
    }

    // Fetch banned users
    const banListUrl = "https://raw.githubusercontent.com/tomanyy/Roblox-Gooner-Ban/refs/heads/main/BanLists/PlayersBanList.txt";
    const banResponse = await fetch(banListUrl);
    const banText = await banResponse.text();
    const bannedUsers = banText.split("\n").map(name => name.trim()).filter(name => name);

    // Fetch group members
    const groupMembersUrl = `https://groups.roblox.com/v1/groups/${groupId}/users`;
    const groupResponseMembers = await fetch(groupMembersUrl);
    const groupDataMembers = await groupResponseMembers.json();

    for (let user of groupDataMembers.users) {
        if (bannedUsers.includes(user.username)) {
            await kickUser(groupId, user.userId);
        }
    }
}

async function kickUser(groupId, userId) {
    const url = `https://groups.roblox.com/v1/groups/${groupId}/users/${userId}`;
    await fetch(url, { method: "DELETE", credentials: "include" });
    console.log(`✅ Kicked user: ${userId}`);
}
