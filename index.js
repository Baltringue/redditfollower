require('dotenv').config();
const Reddit = require('reddit');
const Discord = require('discord.js');
const redgifs = require('redgif-dl');
const fs = require('fs');

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

client.on('ready', () => {
    client.guilds.fetch(process.env.GUILD)
        .then(guild => {
            setInterval(() => {
                for (const subreddit of subreddits) {
                    reddit.get(`/r/${subreddit}/hot`)
                        .then(response => {
                            let channel = client.channels.cache.find(channel => channel.name === subreddit.toLowerCase());
                            if (!channel) {
                                guild.channels.create(subreddit)
                                    .then(textChannel => {
                                        channel = textChannel;
                                    })
                                    .catch(console.error)
                            }
                            for (const children of response.data.children) {
                                const article = children.data;
                                if (!articles[article.id]) {
                                    articles[article.id] = true;
                                    fs.writeFileSync('./articles.json', JSON.stringify(articles));
                                    if (article.url.includes('.jpg') || article.url.includes('.jpeg') || article.url.includes('.png')) {
                                        channel.send({
                                            files: [article.url]
                                        })
                                            .catch(console.error);
                                    }
                                    if (article.url.includes('.gif')) {
                                        channel.send(article.url)
                                            .catch(console.error);
                                    }
                                    if (article.url.includes('redgifs')) {
                                        redgifs(article.url, article.id, './redgifs/')
                                            .then(path => {
                                                channel.send({
                                                    files: [path.HQ]
                                                })
                                                    .then(() => {
                                                        fs.unlinkSync(path.HQ);
                                                        fs.unlinkSync(path.LQ);
                                                    })
                                                    .catch(error => {
                                                        switch (error.code) {
                                                            case '40005':
                                                                channel.send({
                                                                    files: [path.LQ]
                                                                })
                                                                    .catch(console.error);
                                                                break;
                                                            default:
                                                                fs.unlinkSync(path.HQ);
                                                                fs.unlinkSync(path.LQ);
                                                                break;
                                                        }
                                                    });
                                            })
                                            .catch(console.error);
                                    }
                                }
                            }
                        })
                        .catch(console.error);
                }
            }, 5000);
        })
        .catch(console.error);
});

client.on('message', (message) => {
    if (message.author.bot) return;

    const subreddit = message.content;

    for (let i = 0; i < subreddits.length; i++) {
        if (subreddit === subreddits[i]) {
            subreddits.splice(i, 1);
            console.log(`removed ${subreddit}`);
            return fs.writeFileSync('./subreddits.json', JSON.stringify(subreddits));
        }
    }

    subreddits.push(subreddit);
    console.log(`added ${subreddit}`);
    fs.writeFileSync('./subreddits.json', JSON.stringify(subreddits));
});