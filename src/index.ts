import TwitterArchive, { PartialTweet } from "twitter-archive-reader";
import { config } from "dotenv";
import { createWriteStream, existsSync, readFile, WriteStream } from "fs";
import { promisify } from "util";
import { TwitterClient } from "twitter-api-client";
import { pRateLimit } from "p-ratelimit";

const readFilePromise = promisify(readFile);

config();

async function doStuff() {
  const archive = new TwitterArchive(
    "twitter-2021-04-20-b13ad38adcc00eb894d780aaba32e4763bb01e90c385878da2b1148f47720f86.zip"
  );

  await archive.ready();

  console.log("total tweets", archive.tweets.all.length);

  const unlikedTweets = archive.tweets.all.filter(
    (tweet) => tweet.favorite_count === 0
  );

  console.log("unliked tweets", unlikedTweets.length);

  const twitterClient = new TwitterClient({
    apiKey: process.env.TWITTER_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET_KEY,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  });

  const deletedTweets = new DeletedTweets();
  await deletedTweets.setup();

  const limit = pRateLimit({
    interval: 1000 * 60 * 15, // 15 minutes
    rate: 450,
  });

  const promises = unlikedTweets.map(async (tweet) => {
    if (!deletedTweets.isDeleted(tweet.id_str)) {
      await limit(async () => {
        try {
          const result = await twitterClient.tweets.statusesDestroyById({
            id: tweet.id_str,
          });

          if (result && result.id_str) {
            console.log("deleted", tweet.id_str);
            deletedTweets.push(tweet);
          }
        } catch (e) {
          console.error(tweet.id_str, "failed to delete", e);
        }
      });
    }
  });

  await Promise.all(promises);

  deletedTweets.close();
}

interface DeletedTweet {
  id: string;
  deletedAt: string;
}

class DeletedTweets {
  private tweets: Record<string, DeletedTweet>;
  private outStream: WriteStream;

  constructor(private fileName = "deleted_tweets.csv") {}

  async setup() {
    this.tweets = {};

    if (existsSync(this.fileName)) {
      const rawFile = await readFilePromise(this.fileName);
      const lines = rawFile.toString().split("\n");

      lines.forEach((line) => {
        const vals = line.split(",");
        const deleted = { id: vals[0], deletedAt: vals[1] };
        this.tweets[deleted.id] = deleted;
      });
    }

    this.outStream = createWriteStream(this.fileName, { flags: "a+" });
  }

  isDeleted(id: string): boolean {
    return typeof this.tweets[id] !== "undefined";
  }

  async push(tweet: PartialTweet) {
    const deleted = {
      id: tweet.id_str,
      deletedAt: new Date().toISOString(),
    };

    this.tweets[deleted.id] = deleted;

    this.outStream.write(`${deleted.id},${deleted.deletedAt}\n`);
  }

  close() {
    this.outStream.close();
  }
}

doStuff();
