// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const path = require('path');

const fs = require('fs');
// Reading followersList JSON file
const followersList = require('./data/followersList');
// Reading friendsList JSON file
const friendsList = require('./data/followersList');
const followersNotFollowedList = require('./data/followersNotFollowedList.json');

const { promisify } = require('util');
const sleep = promisify(setTimeout);

const dotenv = require('dotenv');
// Import required bot configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

const restify = require('restify');
const { TwitterAdapter, TwitterSubscriptionManager, TwitterWebhookManager } = require('@botbuildercommunity/adapter-twitter');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter } = require('botbuilder');

// This bot's main dialog.
const { EchoBot } = require('./bot');

// Create HTTP server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

server.use(restify.plugins.queryParser());

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

const twitterAdapter = new TwitterAdapter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_TOKEN_SECRET,
    screen_name: process.env.TWITTER_APPLICATION_USERNAME
});

const Twit = require('twit');

const T = new Twit({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_TOKEN_SECRET
});

T.get('account/verify_credentials', {
    include_entities: false,
    skip_status: true,
    include_email: false
}, onAuthenticated);

function onAuthenticated(err, res) {
    if (err) {
        throw err;
    }

    console.log('Authentication successful. Running bot...\r\n');
}

// Store list of friends and followers in JSON
if (friendsList.length > 0 && followersList.length > 0) {
    console.log('Data Exists');
} else {
    console.log('Data Doesnt Exists');

    T.get('friends/list', { screen_name: process.env.TWITTER_APPLICATION_USERNAME, count: 200 }, function getData(err, data, response) {
        if (err) {
            console.log('friends - Entry err');
            console.log(`Error Code: ${ err.code }`);
            if (err.code === 88) {
                console.log('15 mins sleep...');
                setTimeout(function() {
                    T.get('friends/list', { screen_name: process.env.TWITTER_APPLICATION_USERNAME, cursor: data.next_cursor, count: 200 }, getData);
                }, 900000);
            }
        } else {
            if (data.next_cursor > 0) {
                // Defining new user
                data.users.forEach(key => {
                    const user = {
                        id: key.id,
                        screen_name: key.screen_name,
                        following: key.following
                    };

                    // Save user details in friendsList.json
                    writeToFile(user, friendsList, './data/friendsList.json');
                });

                T.get('friends/list', { screen_name: process.env.TWITTER_APPLICATION_USERNAME, cursor: data.next_cursor, count: 200 }, getData);
            } else {
                data.users.forEach(key => {
                    const user = {
                        id: key.id,
                        screen_name: key.screen_name,
                        following: key.following
                    };

                    // Save user details in friendsList.json
                    writeToFile(user, friendsList, './data/friendsList.json');
                });

                console.log('friends list created!');
            }
        }
    });

    T.get('followers/list', { screen_name: process.env.TWITTER_APPLICATION_USERNAME, count: 200 }, function getData(err, data, response) {
        if (err) {
            console.log('Followers - Entry err');
            console.log(`Error Code: ${ err.code }`);
            if (err.code === 88) {
                console.log('15 mins sleep...');
                setTimeout(function() {
                    T.get('followers/list', { screen_name: process.env.TWITTER_APPLICATION_USERNAME, cursor: data.next_cursor, count: 200 }, getData);
                }, 900000);
            }
        } else {
            if (data.next_cursor > 0) {
                // Defining new user
                data.users.forEach(key => {
                    if (!key.following) {
                        const user = {
                            id: key.id,
                            screen_name: key.screen_name,
                            following: key.following
                        };

                        // Save user details in followersNotFollowedList.json
                        writeToFile(user, followersNotFollowedList, './data/followersNotFollowedList.json');
                    }
                    const user = {
                        id: key.id,
                        screen_name: key.screen_name,
                        following: key.following
                    };

                    // Save user details in followersList.json
                    writeToFile(user, followersList, './data/followersList.json');
                });

                T.get('followers/list', { screen_name: process.env.TWITTER_APPLICATION_USERNAME, cursor: data.next_cursor, count: 200 }, getData);
            } else {
                // console.log(data);
                data.users.forEach(key => {
                    if (!key.following) {
                        const user = {
                            id: key.id,
                            screen_name: key.screen_name,
                            following: key.following
                        };

                        // Save user details in followersNotFollowedList.json
                        writeToFile(user, followersNotFollowedList, './data/followersNotFollowedList.json');
                    }
                    const user = {
                        id: key.id,
                        screen_name: key.screen_name,
                        following: key.following
                    };

                    // Save user details in followersList.json
                    writeToFile(user, followersList, './data/followersList.json');
                });
                console.log('followers list created!');
            }
        }
    });
}

function writeToFile(data, fileObject, fileName) {
    // Adding new data to the object
    fileObject.push(data);

    // Writing to the file
    fs.writeFile(fileName, JSON.stringify(fileObject), err => {
        // Checking for errors
        if (err) throw err;

        console.log('Done writing'); // Succes
    });
}

function followUser(user) {
    T.post('friendships/create', { screen_name: user }, function(err, response) {
        if (err) {
            console.log(err);
        } else {
            // console.log(response);
            console.log(user, ': **FOLLOWED**');
        }
    });
}

function searchTweet(sQuery, mode) {
    T.get('search/tweets', { q: sQuery, count: 100, lang: 'en' }, function(err, data, response) {
        console.log('------------------------------------------');
        if (err) {
            console.log('Search Error');
            console.log(err);
        } else {
            let counter = data.statuses.length;
            while (counter > 0) {
                console.log(data.statuses[counter - 1].id_str);
                console.log(data.statuses[counter - 1].text);
                const tweetID = data.statuses[counter - 1].id_str;

                let postRequest;
                if (mode === 'like') {
                    postRequest = 'favorites/create';
                } else if (mode === 'retweet') {
                    postRequest = 'statuses/retweet/:id';
                }

                T.post(postRequest, { id: data.statuses[counter - 1].id_str }, function(err, data, response) {
                    if (err) {
                        console.log(mode + ' Error');
                        console.log(err);
                    } else {
                        console.log(tweetID + ' - ' + mode);
                    }
                });
                counter--;
            }
            // console.log(data);
            // console.log(data.statuses.length);
        }
    });
}

// Listen for liking tweets.
server.get('/api/like', (req, res) => {
    const keyword = req.query.keyword;
    const dateFrom = req.query.from;
    const dateTo = req.query.to;

    if (keyword === undefined && dateFrom === undefined && dateTo === undefined) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write('<h1>Please provide these parameters with url: </h1><br/> <b>keyword</b>=< Word to be searched > [<b>required</b>] <br/> <b>from</b>=< Starting Date yyyy-mm-dd> [<b>Optional</b>] <br/> <b>to</b>= < Last Date yyyy-mm-dd> [<b>Optinal</b>]');
        res.end();
    } else if (keyword === undefined) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write('<h1>Please provide these parameters with url: </h1><br/> <b>keyword</b>=< Word to be searched > [<b>required</b>] ');
        res.end();
    } else {
        var searchQuery = keyword;

        if (dateFrom !== undefined) {
            searchQuery = searchQuery + ' since:' + dateFrom;
        }

        if (dateTo !== undefined) {
            searchQuery = searchQuery + ' until:' + dateTo;
        }
        let counter = followersList.length;

        // Requests / 15-min window
        let rateLimit = 180;

        const loopData = async () => {
            while (counter > 0) {
                if (rateLimit > 0) {
                    searchTweet(searchQuery + ' from:' + followersList[counter - 1].screen_name, 'like');
                    rateLimit--;
                } else {
                    console.log('15 mins sleep...');
                    await sleep(900000);
                    searchTweet(searchQuery + ' from:' + followersList[counter - 1].screen_name, 'like');
                    rateLimit = 179;
                }

                counter--;
            }
        };

        loopData();

        res.end();
    }
});

// Listen for retweets.
server.get('/api/retweet', (req, res) => {
    const keyword = req.query.keyword;
    const dateFrom = req.query.from;
    const dateTo = req.query.to;

    if (keyword === undefined && dateFrom === undefined && dateTo === undefined) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write('<h1>Please provide these parameters with url: </h1><br/> <b>keyword</b>=< Word to be searched > [<b>required</b>] <br/> <b>from</b>=< Starting Date yyyy-mm-dd> [<b>Optional</b>] <br/> <b>to</b>= < Last Date yyyy-mm-dd> [<b>Optinal</b>]');
        res.end();
    } else if (keyword === undefined) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write('<h1>Please provide these parameters with url: </h1><br/> <b>keyword</b>=< Word to be searched > [<b>required</b>] ');
        res.end();
    } else {
        var searchQuery = keyword;

        if (dateFrom !== undefined) {
            searchQuery = searchQuery + ' since:' + dateFrom;
        }

        if (dateTo !== undefined) {
            searchQuery = searchQuery + ' until:' + dateTo;
        }
        let counter = followersList.length;

        // Requests / 15-min window
        let rateLimit = 180;

        const loopData = async () => {
            while (counter > 0) {
                if (rateLimit > 0) {
                    searchTweet(searchQuery + ' from:' + followersList[counter - 1].screen_name, 'retweet');
                    rateLimit--;
                } else {
                    console.log('15 mins sleep...');
                    await sleep(900000);
                    searchTweet(searchQuery + ' from:' + followersList[counter - 1].screen_name, 'retweet');
                    rateLimit = 179;
                }

                counter--;
            }
        };

        loopData();

        res.end();
    }
});

// Listen for follow users request.
server.get('/api/follow', (req, res) => {
    let followCount = 1; // Default number of users to follow, in case count value not passed
    if (parseInt(req.query.count) > 1) {
        followCount = parseInt(req.query.count);
    }

    let temp = 0;

    if (followersNotFollowedList.length === 0) {
        res.send('followersNotFollowedList size = 0, 0 users followed!');
        res.end();
    } else {
        while (followersNotFollowedList.length > 0 && temp < followCount) {
            followUser(followersNotFollowedList[followersNotFollowedList.length - 1].screen_name);
            console.log(followersNotFollowedList[followersNotFollowedList.length - 1].screen_name);
            temp++;
            followersNotFollowedList.pop();
        }
        // Update followersNotFollowedList.json file content
        fs.writeFile('./data/followersNotFollowedList.json', JSON.stringify(followersNotFollowedList), err => {
            // Checking for errors
            if (err) throw err;

            console.log('Done updating'); // Succes
        });
        console.log(followersNotFollowedList.length);
        res.status(200);
        res.send(`followersNotFollowedList size = ${ followersNotFollowedList.length }, ${ temp } users followed!`);
        res.end();
    }
});

// Catch-all for errors.
const onTurnErrorHandler = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Set the onTurnError for the singleton BotFrameworkAdapter.
adapter.onTurnError = onTurnErrorHandler;

// Create the main dialog.
const myBot = new EchoBot();

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // Route to main dialog.
        await myBot.run(context);
    });
});

server.post('/api/twitter/messages', (req, res) => {
    twitterAdapter.processActivity(req, res, async (context) => {
        if (context.activity.type === 'message') {
            await myBot.run(context);
        }
    });
});

server.get('/api/twitter/messages', (req, res) => {
    try {
        const webHookResponse = TwitterWebhookManager.processWebhook(req, process.env.TWITTER_CONSUMER_SECRET);
        res.send(webHookResponse);
    } catch (e) {
        res.status(500);
        res.send({ error: e });
    }
});

server.get('/api/twitter/webhook', async (req, res) => {
    try {
        const webhookID = await TwitterWebhookManager.registerWebhook(twitterAdapter.client, process.env.TWITTER_ACTIVITY_ENV, process.env.TWITTER_WEBHOOK_URL);
        res.send({ webhookID: webhookID });
    } catch (e) {
        res.status(500);
        res.send({ error: e });
    }
});

server.get('/api/twitter/webhook/list', async (req, res) => {
    try {
        const webhooks = await TwitterWebhookManager.listWebhooks(process.env.TWITTER_CONSUMER_KEY, process.env.TWITTER_CONSUMER_SECRET, process.env.TWITTER_ACTIVITY_ENV);
        res.send({ webhooks: webhooks });
    } catch (e) {
        res.status(500);
        res.send({ error: e });
    }
});

server.get('/api/twitter/webhook/update', async (req, res) => {
    const webhooks = await TwitterWebhookManager.listWebhooks(process.env.TWITTER_CONSUMER_KEY, process.env.TWITTER_CONSUMER_SECRET, process.env.TWITTER_ACTIVITY_ENV);
    if (webhooks.length > 0) {
        const webhookID = webhooks[0].id;
        try {
            const success = await TwitterWebhookManager.updateWebhook(
                process.env.TWITTER_CONSUMER_KEY,
                process.env.TWITTER_CONSUMER_SECRET,
                process.env.TWITTER_ACCESS_TOKEN,
                process.env.TWITTER_TOKEN_SECRET,
                process.env.TWITTER_ACTIVITY_ENV,
                webhookID);
            res.send({ success: success });
        } catch (e) {
            res.status(500);
            res.send({ error: e });
        }
    } else {
        res.send({ message: 'No webhooks registered.' });
    }
});

server.get('/api/twitter/webhook/remove', async (req, res) => {
    const webhooks = await TwitterWebhookManager.listWebhooks(process.env.TWITTER_CONSUMER_KEY, process.env.TWITTER_CONSUMER_SECRET, process.env.TWITTER_ACTIVITY_ENV);
    if (webhooks.length > 0) {
        const webhookID = webhooks[0].id;
        try {
            const success = await TwitterWebhookManager.removeWebhook(
                process.env.TWITTER_CONSUMER_KEY,
                process.env.TWITTER_CONSUMER_SECRET,
                process.env.TWITTER_ACCESS_TOKEN,
                process.env.TWITTER_TOKEN_SECRET,
                process.env.TWITTER_ACTIVITY_ENV,
                webhookID);
            res.send({ success: success });
        } catch (e) {
            res.status(500);
            res.send({ error: e });
        }
    } else {
        res.send({ message: 'No webhooks registered.' });
    }
});

server.get('/api/twitter/subscription', async (req, res) => {
    try {
        const result = await TwitterSubscriptionManager.manageSubscription(
            process.env.TWITTER_CONSUMER_KEY,
            process.env.TWITTER_CONSUMER_SECRET,
            process.env.TWITTER_ACCESS_TOKEN,
            process.env.TWITTER_TOKEN_SECRET,
            process.env.TWITTER_ACTIVITY_ENV);
        res.send({ success: result });
    } catch (e) {
        res.status(500);
        res.send({ error: e });
    }
});

server.get('/api/twitter/subscription/list', async (req, res) => {
    try {
        const subs = await TwitterSubscriptionManager.listSubscriptions(
            process.env.TWITTER_CONSUMER_KEY,
            process.env.TWITTER_CONSUMER_SECRET,
            process.env.TWITTER_ACTIVITY_ENV
        );
        res.send({ subs: subs });
    } catch (e) {
        res.status(500);
        res.send({ error: e });
    }
});

server.get('/', (req, res) => {
    res.send({ message: 'This service is up.' });
});

// Listen for Upgrade requests for Streaming.
server.on('upgrade', (req, socket, head) => {
    // Create an adapter scoped to this WebSocket connection to allow storing session data.
    const streamingAdapter = new BotFrameworkAdapter({
        appId: process.env.MicrosoftAppId,
        appPassword: process.env.MicrosoftAppPassword
    });
    // Set onTurnError for the BotFrameworkAdapter created for each connection.
    streamingAdapter.onTurnError = onTurnErrorHandler;

    streamingAdapter.useWebSocket(req, socket, head, async (context) => {
        // After connecting via WebSocket, run this logic for every request sent over
        // the WebSocket connection.
        await myBot.run(context);
    });
});
