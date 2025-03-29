-- Hello hello!
-- This is the script that bans bad people from your game
-- Put inside ServerScriptService to make this script work!!!
-- Also remember to have HTTP requests enabled in your game

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")

local PlayerBanListUrls = {
    "https://raw.githubusercontent.com/tomanyy/Roblox-Gooner-Ban/refs/heads/main/BanLists/PlayersBanList.txt",
    -- Add more custom ban list URLs here
}

local BannedGroupsListURL = "https://raw.githubusercontent.com/tomanyy/Roblox-Gooner-Ban/refs/heads/main/BanLists/GroupBanList.txt"
local BannedItemsListURL = "https://raw.githubusercontent.com/tomanyy/Roblox-Gooner-Ban/refs/heads/main/BanLists/ItemsBanList.txt"

local bannedUsers = {}
local bannedGroups = {}
local bannedItems = {}
local allowedAdmins = {12345678, 87654321} -- Replace with User IDs of authorized users

local function fetchBanList()
    bannedUsers = {}
    for _, url in ipairs(PlayerBanListUrls) do
        local success, response = pcall(function()
            return HttpService:GetAsync(url)
        end)

        if success then
            for userId in response:gmatch("%d+") do
                bannedUsers[tonumber(userId)] = true
            end
        else
            warn("Failed to fetch player ban list from:", url)
        end
    end
end

local function fetchBannedGroups()
    local success, response = pcall(function()
        return HttpService:GetAsync(BannedGroupsListURL)
    end)

    if success then
        bannedGroups = {}
        for groupId in response:gmatch("%d+") do
            bannedGroups[tonumber(groupId)] = true
        end
    else
        warn("Failed to fetch banned groups list.")
    end
end

local function fetchBannedItems()
    local success, response = pcall(function()
        return HttpService:GetAsync(BannedItemsListURL)
    end)

    if success then
        bannedItems = {}
        for itemId in response:gmatch("%d+") do
            bannedItems[tonumber(itemId)] = true
        end
    else
        warn("Failed to fetch banned items list.")
    end
end

local function checkPlayer(player)
    if bannedUsers[player.UserId] then
        player:Kick("You are banned from this game for safety reasons.\n\nPlease appeal in the S.O.R. community server.")
        return
    end

    local flaggedGroups = {}
    for groupId in pairs(bannedGroups) do
        if player:IsInGroup(groupId) then
            table.insert(flaggedGroups, "Group ID: " .. groupId)
        end
    end

    if #flaggedGroups > 0 then
        player:Kick("You have been kicked due to association with banned groups.\n\nFlagged Groups: " .. table.concat(flaggedGroups, ", "))
        return
    end

    task.wait(3) -- Give time for character to load
    if player.Character then
        local humanoid = player.Character:FindFirstChildOfClass("Humanoid")
        if humanoid then
            local equippedItems = {}
            for _, accessory in ipairs(player.Character:GetChildren()) do
                if accessory:IsA("Accessory") then
                    local id = accessory:GetAttribute("AssetId")
                    if id and bannedItems[id] then
                        table.insert(equippedItems, accessory.Name .. " (ID: " .. id .. ")")
                    end
                end
            end

            if #equippedItems > 0 then
                player:Kick("You have been kicked for wearing banned items.\n\nFlagged Items: " .. table.concat(equippedItems, ", "))
                return
            end
        end
    end
end

local function refreshBanLists()
    fetchBanList()
    fetchBannedGroups()
    fetchBannedItems()
    for _, player in ipairs(Players:GetPlayers()) do
        checkPlayer(player)
    end
end

Players.PlayerAdded:Connect(checkPlayer)

fetchBanList()
fetchBannedGroups()
fetchBannedItems()

Players.PlayerAdded:Connect(function(player)
    player.Chatted:Connect(function(message)
        if message == "!reloadbans" and allowedAdmins[player.UserId] then
            refreshBanLists()
            player:SendMessage("Ban lists reloaded successfully.")
        end
    end)
end)
