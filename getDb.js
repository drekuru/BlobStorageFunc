const MongoClient = require('mongodb').MongoClient
const dbUrl = process.env.dbUri
const dbName = process.env.dbName
const dbOptions =
{
    useUnifiedTopology: false,
    useNewUrlParser: true
};

let db

module.exports = async function ()
{
    //establish db connection if one isn't present
    if (!db)
    {
        const client = new MongoClient(dbUrl, dbOptions);
        db = await (await client.connect()).db(dbName)
    }

    return db;
};
