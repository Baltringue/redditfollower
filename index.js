require('dotenv').config();
const Reddit = require('reddit');
const redgifs = require('redgif-dl');
const fs = require('fs');
const Discord = require('discord.js');

const client = new Discord.Client();
const reddit = new Reddit({
    username: process.env.RUSERNAME,
    password: process.env.PASSWORD,
    appId: process.env.APPID,
    appSecret: process.env.APPSECRET
});

const articles = JSON.parse(fs.readFileSync('./articles.json', 'utf-8'));
const subreddits = JSON.parse(fs.readFileSync('./subreddits.json', 'utf-8'));

client.login(process.env.TOKEN)
    .catch(console.error);

client.on('ready', async () => {
    const guild = await client.guilds.fetch(process.env.GUILD);
    setInterval(async () => {
        for (const subreddit of subreddits) {
            try {
                const response = await reddit.get(`/r/${subreddit}/new`);
                const channels = client.channels.cache;
                let channel = channels.find(channel => channel.name === subreddit.toLowerCase());
                if (!channel) {
                    channel = await guild.channels.create(subreddit);
                }
                for (const children of response.data.children) {
                    const article = children.data;
                    if (!articles[article.id]) {
                        articles[article.id] = true;
                        fs.writeFileSync('./articles.json', JSON.stringify(articles));
                        if (article.url.includes('.jpg') || article.url.includes('.jpeg') || article.url.includes('.png')) {
                            channel.send({
                                files: [article.url]
                            });
                        }
                        if (article.url.includes('.gif')) {
                            channel.send(article.url);
                        }
                        if (article.url.includes('redgifs')) {
                            const path = await redgifs(article.url, article.id, './redgifs/');
                            await channel.send({
                                files: [path.HQ]
                            });
                            fs.unlinkSync(path.HQ);
                            fs.unlinkSync(path.LQ);
                        }
                    }
                }
            } catch {
                console.error(`an error occurred with the subreddit ${subreddit}`);
            }
        }
    }, 1000);
});

client.on('message', async (message) => {
    if (message.author.bot) return;
    const subreddit = message.content;
    for (let i = 0; i < subreddits.length; i++) {
        if (subreddit === subreddits[i]) {
            subreddits.splice(i, 1);
            fs.writeFileSync('./subreddits.json', JSON.stringify(subreddits));
            return;
        }
    }
    subreddits.push(subreddit);
    fs.writeFileSync('./subreddits.json', JSON.stringify(subreddits));
});