const groupInput = document.getElementById("groupIds");
const autoKickCheckbox = document.getElementById("autoKick");
const bannedUsersList = document.getElementById("bannedUsersList");
const scanNowButton = document.getElementById("scanNowButton");
const errorMsg = document.getElementById("errorMsg");

// Load Saved Settings
chrome.storage.local.get(["groupIds", "autoKick"], function(result) {
    if (result.groupIds) {
        groupInput.value = result.groupIds.join(", ");
    }
    if (result.autoKick !== undefined) {
        autoKickCheckbox.checked = result.autoKick;
    }
});

// Save Group IDs and Auto-Kick Setting
document.getElementById("saveSettings").addEventListener("click", function() {
    const groupIds = groupInput.value.split(",").map(id => id.trim()).filter(id => id);
    const autoKick = autoKickCheckbox.checked;

    chrome.storage.local.set({ groupIds, autoKick }, function() {
        console.log("✅ Settings saved:", { groupIds, autoKick });
    });
});

// Scan Button Click Event
scanNowButton.addEventListener("click", function() {
    const groupIds = groupInput.value.split(",").map(id => id.trim()).filter(id => id);

    if (groupIds.length > 0) {
        bannedUsersList.innerHTML = "<li>Loading...</li>";
        groupIds.forEach(groupId => {
            fetchBannedUsers(groupId);
        });
    } else {
        bannedUsersList.innerHTML = "<li>Please enter valid group IDs to scan.</li>";
    }
});

async function fetchBannedUsers(groupId) {
    console.log("Fetching banned users for group:", groupId); // Log when starting the fetch
    const banListUrl = "https://raw.githubusercontent.com/tomanyy/Roblox-Gooner-Ban/refs/heads/main/BanLists/PlayersBanList.txt";
    const groupMembersUrl = `https://groups.roblox.com/v1/groups/${groupId}/users`;
    const groupInfoUrl = `https://groups.roblox.com/v1/groups/${groupId}`;

    try {
        // Fetch both the banned list and group members simultaneously
        const [banResponse, groupResponse, groupInfoResponse] = await Promise.all([
            fetch(banListUrl),
            fetch(groupMembersUrl),
            fetch(groupInfoUrl)
        ]);

        console.log("Ban List Response:", banResponse); // Log response from the banned list
        console.log("Group Members Response:", groupResponse); // Log response from the group members
        console.log("Group Info Response:", groupInfoResponse); // Log response from the group info

        // Check if all responses are successful
        if (!banResponse.ok || !groupResponse.ok || !groupInfoResponse.ok) {
            throw new Error(`Failed to fetch data. Status: Ban Response: ${banResponse.status}, Group Response: ${groupResponse.status}, Group Info Response: ${groupInfoResponse.status}`);
        }

        // Parse the banned users list
        const banText = await banResponse.text();
        const bannedUsers = banText.split("\n").map(name => name.trim()).filter(name => name);

        // Parse the group members' data
        const groupData = await groupResponse.json();
        console.log("Group Data:", groupData);  // Log the entire group data response

        // Parse the group info to get the ownerId
        const groupInfo = await groupInfoResponse.json();
        const groupOwnerId = groupInfo.ownerId;

        // Get the authenticated user ID
        const authResponse = await fetch("https://users.roblox.com/v1/users/authenticated");
        if (!authResponse.ok) {
            throw new Error("Failed to get authenticated user information.");
        }
        const authData = await authResponse.json();
        const authenticatedUserId = authData.id;

        // Check if the authenticated user is the group owner
        const isGroupOwner = authenticatedUserId === groupOwnerId;

        // Check if group data contains 'data' field
        if (!groupData.data || !Array.isArray(groupData.data)) {
            throw new Error("The group members were not found in the response.");
        }

        // Extract usernames from group members' data
        const groupMembers = groupData.data.map(user => user.username);

        // Compare banned users with group members
        const bannedInGroup = bannedUsers.filter(user => groupMembers.includes(user));

        // Update the DOM with the results
        bannedUsersList.innerHTML = ""; // Clear "Loading..."
        if (bannedInGroup.length === 0) {
            bannedUsersList.innerHTML = `<li>No banned users found in group ${groupId}.</li>`;
        } else {
            bannedInGroup.forEach(user => {
                const li = document.createElement("li");
                li.textContent = user;

                // Allow kicking if the user is the group owner
                if (isGroupOwner) {
                    const kickButton = document.createElement("button");
                    kickButton.textContent = "Kick";
                    kickButton.onclick = async () => {
                        try {
                            await kickUserFromGroup(groupId, user);
                            alert(`User ${user} has been kicked from the group.`);
                        } catch (error) {
                            console.error("Error kicking user:", error);
                            alert("Failed to kick the user.");
                        }
                    };
                    li.appendChild(kickButton);
                }

                bannedUsersList.appendChild(li);
            });
        }
    } catch (error) {
        console.error("Error fetching banned users or group members:", error);
        bannedUsersList.innerHTML = `<li>${error.message}</li>`;  // Display the error message
    }
}

async function kickUserFromGroup(groupId, username) {
    // Find the userId of the banned username
    const groupMembersUrl = `https://groups.roblox.com/v1/groups/${groupId}/users`;
    const groupResponse = await fetch(groupMembersUrl);
    if (!groupResponse.ok) {
        throw new Error(`Failed to fetch group members: ${groupResponse.status}`);
    }

    const groupData = await groupResponse.json();
    const userToKick = groupData.data.find(user => user.username === username);

    if (!userToKick) {
        throw new Error(`User ${username} not found in group.`);
    }

    // Perform the kick using DELETE request
    const kickUrl = `https://groups.roblox.com/v1/groups/${groupId}/users/${userToKick.userId}`;
    const kickResponse = await fetch(kickUrl, {
        method: 'DELETE',
    });

    if (!kickResponse.ok) {
        throw new Error(`Failed to kick user ${username}: ${kickResponse.status}`);
    }

    console.log(`User ${username} has been kicked from the group ${groupId}`);
}

function redirectToRobloxLogin() {
    const clientId = 'YOUR_CLIENT_ID';  // Replace with your Roblox app's client ID
    const redirectUri = chrome.identity.getRedirectURL();  // Get the redirect URI for the extension
    const authUrl = `https://roblox.com/oauth2/authorize?client_id=2690865394566650083&redirect_uri=${redirectUri}&response_type=code&scope=identity`;

    // Redirect to Roblox login page
    window.location.href = authUrl;
}


async function exchangeCodeForAccessToken(code) {
    const clientId = 'YOUR_CLIENT_ID';  // Replace with your Roblox app's client ID
    const clientSecret = 'YOUR_CLIENT_SECRET';  // Replace with your Roblox app's client secret
    const redirectUri = chrome.identity.getRedirectURL();

    const tokenUrl = `https://api.roblox.com/oauth2/token`;

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'code': code,
            'client_id': clientId,
            'client_secret': clientSecret,
            'redirect_uri': redirectUri,
            'grant_type': 'authorization_code',
        })
    });

    const tokenData = await response.json();
    return tokenData.access_token;  // This is the access token you can use for API requests
}

async function getAuthenticatedUser(accessToken) {
    const response = await fetch('https://users.roblox.com/v1/users/authenticated', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,  // Include the access token in the Authorization header
        }
    });

    const userData = await response.json();
    return userData.id;  // Return the user ID of the authenticated user
}
