const getDb = require('./getDb')
const axios = require('axios')
const https = require('https')
const moment = require('moment')
const domain = process.env.AzureStorageUrl

let instance

module.exports = async function ()
{
    //get db
    let db = await getDb()

    //get token
    let token = await db.collection('secrets').findOne({ 'name': process.env.StorageAPIToken })

    //create instance
    if (!instance)
    {
        //creat axios instance
        instance = axios.create(
            {
                baseURL: domain,
                httpsAgent: new https.Agent({ keepAlive: true }),
                headers:
                {
                    'maxContentLength': 'Infinity',
                    'maxBodyLength': 'Infinity',
                    'Authorization': `Bearer ${token.value}`,
                    'x-ms-blob-type': 'BlockBlob',
                    'x-ms-version': '2019-12-12',
                    'Date': `${moment().utc().format('ddd, DD MMM YYYY HH:mm:ss')} GMT`

                }
            })
    }
    else
    {
        //update Date header and token
        instance.defaults.headers.common['Authorization'] = 'Bearer ' + token.value
        instance.defaults.headers.common['Date'] = `${moment().utc().format('ddd, DD MMM YYYY HH:mm:ss')} GMT`
    }

    return instance;
}