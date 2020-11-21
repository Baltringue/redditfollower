const dotenv = require('dotenv');
const Reddit = require('reddit');
const Discord = require('discord.js');
const redgifs = require('redgif-dl');
const fs = require('fs');

dotenv.config();

const client = new Discord.Client();
const reddit = new Reddit({
    username: process.env.RUSERNAME,
    password: process.env.PASSWORD,
    appId: process.env.APPID,
    appSecret: process.env.APPSECRET
});

const articles = JSON.parse(fs.readFileSync('./articles.json', 'utf-8'));
const subreddits = JSON.parse(fs.readFileSync('./subreddits.json', 'utf-8'));

client.login(process.env.TOKEN).catch(console.error);

const types = ['hot','new'];

client.on('ready', async () => {
    const guild = await client.guilds.fetch(process.env.GUILD).catch(console.error);

    setInterval(async () => {
        for (const subreddit of subreddits) {
            for (const type of types) {
                const response = await reddit.get(`/r/${subreddit}/${type}`).catch(console.error);
                let channel = client.channels.cache.find(channel => channel.name === subreddit.toLowerCase());

                if (!channel) {
                    channel = await guild.channels.create(subreddit).catch(console.error);
                }

                for (const children of response.data.children) {
                    const article = children.data;

                    if (!articles[article.id]) {
                        articles[article.id] = true;
                        fs.writeFileSync('./articles.json', JSON.stringify(articles));

                        if (article.url.includes('.jpg') || article.url.includes('.jpeg') || article.url.includes('.png')) {
                            channel.send({ files: [article.url] }).catch(console.error);
                        }

                        if (article.url.includes('.gif')) {
                            channel.send(article.url).catch(console.error);
                        }

                        if (article.url.includes('redgifs')) {
                            const path = await redgifs(article.url, article.id, './redgifs/').catch(console.error);
                            await channel.send({ files: [path.HQ] })
                                .catch(async (error) => {
                                    switch (error.code) {
                                        case '40005':
                                            channel.send(path.LQ).catch(console.error);
                                            break;
                                        default:
                                            console.error(error);
                                            break;
                                    }
                                });

                            fs.unlinkSync(path.HQ);
                            fs.unlinkSync(path.LQ);
                        }
                    }
                }
            }
        }
    }, 5000);
});

client.on('message', async (message) => {
    if (message.author.bot) return;

    const subreddit = message.content;

    for (let i = 0; i < subreddits.length; i++) {
        if (subreddit === subreddits[i]) {
            subreddits.splice(i, 1);
            console.log(`removed ${subreddit}`);
            fs.writeFileSync('./subreddits.json', JSON.stringify(subreddits));
            return;
        }
    }

    subreddits.push(subreddit);
    console.log(`added ${subreddit}`);
    fs.writeFileSync('./subreddits.json', JSON.stringify(subreddits));
});