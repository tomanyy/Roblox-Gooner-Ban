import discord 
import aiohttp
import asyncio
import time
import random

TOKEN = input("Enter your Discord bot token: ").strip()
GUILD_ID = int(input("Enter your Discord guild ID: ").strip())
AUTH_TOKEN = input("Enter your Rover API token: ").strip()

discord_ids = input("Enter Discord user IDs to check (comma-separated): ").strip().split(",")

discord_ids = [id.strip() for id in discord_ids]  
OUTPUT_FILE = "RobloxUserIDs.txt"

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)

async def fetch_roblox_id(session, discord_id):
    url = f"https://registry.rover.link/api/guilds/{GUILD_ID}/discord-to-roblox/{discord_id}"
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}  

    try:
        async with session.get(url, headers=headers) as response:
            print(f"Fetching {discord_id}, Status Code: {response.status}")

            if response.status == 429:
                wait_time = random.randint(30, 60)
                print(f"Rate limit exceeded. Waiting {wait_time} seconds...")
                await asyncio.sleep(wait_time)
                return await fetch_roblox_id(session, discord_id) 

            if response.status != 200:
                print(f"Error: {response.status}, Response: {await response.text()}")
                return None

            data = await response.json()
            print(f"API Response for {discord_id}: {data}")

            return data.get("robloxId")
    except Exception as e:
        print(f"Error fetching Roblox ID for {discord_id}: {e}")
        return None

@client.event
async def on_ready():
    print(f'Logged in as {client.user}')
    roblox_ids = []
    async with aiohttp.ClientSession() as session:
        for discord_id in discord_ids:
            roblox_id = await fetch_roblox_id(session, discord_id)
            if roblox_id:
                roblox_ids.append(roblox_id)
            else:
                print(f"Failed to fetch Roblox ID for {discord_id}") 
    
    if not roblox_ids:
        print("No valid Roblox IDs found.")
        return

    with open(OUTPUT_FILE, "w") as file:
        for roblox_id in roblox_ids:
            file.write(f"{roblox_id}\n")
    
    print("Roblox IDs fetched! Check RobloxUserIDs.txt")
    await client.close()

client.run(TOKEN)
