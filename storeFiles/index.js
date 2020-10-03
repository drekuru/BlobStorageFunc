const multipart = require('parse-multipart');
const getDb = require('../getDb');
const getAzureStorage = require('../getAzureStorage')

const storageUrl = process.env.AzureStorageUrl
const storageToken = process.env.AzureStorageSAS

module.exports = async function (context, req)
{
    let response = {};
    try
    {
        //create axios connection to azure photo storage
        let storage = await getAzureStorage(context)

        //get db connection
        let db = await getDb(context)

        //upload images
        response = await storeFiles(context, req, db, storage)
    }
    catch (err)
    {
        if (err.response == undefined)
        {
            context.log(err)
            response.status = 500
            response.data = err
        }
        else
        {
            response.data = err.response.data
            response.status = err.response.status
            context.log(response)
        }
    }

    //response
    context.res =
    {
        headers: { 'Content-Type': 'application/json' },
        status: response.status,
        body: response
    }
}

async function storeFiles(context, req, db, storage)
{
    //array of urls and file names
    let attachments = []

    //encode body to base64 string
    let bodyBuffer = Buffer.from(req.body);

    //get boundry
    let boundary = multipart.getBoundary(req.headers['content-type']);

    //parse files
    let parts = multipart.Parse(bodyBuffer, boundary);

    //iterate over every file in the payload
    for (let i = 0; i < parts.length; i++)
    {
        //compose file path
        let name = `${req.query.orderId}/${parts[i].filename}`

        //if the file is larger than 4mb split into chunks and append 1 chunk at a time
        if (parts[i].data.length >= 3800000)
        {
            //create options for creating empty file
            let options =
            {
                method: 'PUT',
                url: `/files/${name}`,
                headers: { 'x-ms-blob-type': 'AppendBlob', 'Content-Length': 0 }
            }

            //initialize empty file
            let res = await storage(options)

            //change header to append block type instead of blockblob
            let config = { headers: { 'x-ms-blob-type': 'AppendBlob' } }

            //break buffer into chunks less than 4 mb (around 3)
            for (let counter = 0; counter < parts[i].data.length;)
            {

                //track bytes
                let difference = counter + 3000000
                if (counter + 3000000 > parts[i].data.length)
                {
                    difference = parts[i].data.length
                }

                //split array of file data into chunks
                let chunks = parts[i].data.slice(counter, difference)

                //upload additional chunk
                await storage.put(`/files/${name}?comp=appendblock`, chunks, config)

                //move buffer index up
                counter = difference
            }

        }
        else
        {
            //upload file to blob storage
            let res = await storage.put(`/files/${name}`, parts[i].data)
            context.log(res.status)
        }

        //compose file url for convenience
        let url = `${storageUrl}/files/${name}${storageToken}`

        //create this file in db collection
        await db.collection('attachments').updateOne({ 'filename': parts[i].filename, 'orderId': req.query.orderId, 'type': req.query.type }, { $set: { 'url': url } }, { upsert: true })

        //add file to return body
        attachments.push({ 'url': url, 'filename': parts[i].filename, 'type': req.query.type })
    }

    return { 'status': 200, 'data': attachments }

}