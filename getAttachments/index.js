const getDb = require('../getDb');

module.exports = async function (context, req)
{
    let response = {}
    if (req.body && req.body.orderId)
    {
        try
        {
            //create axios connection to db
            let db = await getDb(context)

            //get urls for the order 
            response = await getLinks(context, req, db)
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
    }
    else
    {
        response.message = 'Missing Payload'
        response.status = 400
    }

    //response
    context.res =
    {
        headers: { 'Content-Type': 'application/json' },
        status: response.status,
        body: response
    }
}

async function getLinks(context, req, db)
{
    //query to search by
    let query =
    {
        'orderId': req.body.orderId
    }

    //look up attachments in db based on order Id
    let attachments = await db.collection('attachments').find(query).project({ _id: 0, filename: 1, url: 1 }).toArray()

    // if any files are found filter based on body.type
    if (attachments)
    {
        return { 'status': 200, 'data': attachments }
    }
    else
    {
        return { 'status': 404, 'data': 'No Files Found' }
    }

}