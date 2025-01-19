const postsModel = require('../models/posts');
const topicsModel = require('../models/topics');
const Category = require('../models/categories');
module.exports = {
    get: async(req, res) => {
        const { page, size, idTopics } = req.query;
        const init = (page - 1) * size;
        const offset = page * size;
        const postsCount = await new Promise((resolve, reject) => {
            postsModel.getCount(req.con, `where id_topics=${idTopics}`, (error, rows) => {
                if (error) {
                    return reject(
                        "Ha ocurrido un error trayendo el total de topics: " + error
                    );
                }
                console.log(rows[0]);

                resolve(rows[0]);
            });
        });
        console.log(postsCount.count);
        postsModel.get(req.con, `where id_topics=${idTopics} LIMIT ${init},${offset}`, (err, result) => {
            if (err) {
                res.status(500).send({
                    response: "Ha ocurrido un error listando los topics" + err,
                });
            }
            res.status(200).send({
                response: { data: result, totalRows: postsCount.count }
            });
        });
    },
    store: (req, res) => {
        console.log(new Date().toDateString() + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }));
        var object = JSON.stringify({
            date: `${new Date().toDateString()} ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}`,
            user: req.body.id_user_send,
            author: req.body.author
        });
        req.body.date = `${new Date().toDateString()} ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}`;
        postsModel.store(req.con, req.body, async(err, result) => {
            if (err) {
                res.status(500).send({
                    response: "Ha ocurrido un error creando el posts " + err,
                });
            }

            var topic = await new Promise((resolve, reject) => {
                topicsModel.getById(req.con, req.body.id_topics, (err, result) => {
                    if (err) {
                        return reject(
                            "Ha ocurrido un error en posts: " + err
                        );
                    }
                    resolve(result[0]);
                });
            });
            topic.replies = topic.replies + 1;
            var topicUpdate = await new Promise((resolve, reject) => {
                topicsModel.update(req.con, `update topics set replies=${topic.replies}, last_post='${object}' where id=${ req.body.id_topics}`, (err, result) => {
                    if (err) {
                        return reject(
                            "Ha ocurrido un error en posts: " + err
                        );
                    }
                    resolve(result[0]);
                });
            });


            var category = await new Promise((resolve, reject) => {
                Category.getById(req.con, topic.id_categories, (err, result) => {
                    if (err) {
                        return reject(
                            "Ha ocurrido un error en topics: " + err
                        );
                    }
                    resolve(result[0]);
                });
            });
            category.posts = category.posts + 1;
            Category.update(req.con, `UPDATE categories set posts=${  category.posts }, last_post='${object}' where id= ${ topic.id_categories}`, (err, result) => {
                if (err) {
                    res.status(500).send({
                        response: "Ha ocurrido un error creando el topics" + err,
                    });
                }
                res.status(200).send({
                    response: 'success'
                });
            });

        });
    },
    delete: (req, res) => {
        const { id } = req.params;
        postsModel.delete(req.con, id, (err, result) => {
            if (err) {
                res.status(500).send({
                    response: "Ha ocurrido un error eliminando el posts" + err,
                });
            }
            res.status(200).send({
                response: 'success'
            });
        });
    },
    update: (req, res) => {
        const { id } = req.params;
        postsModel.update(req.con, `update posts set message=${req.body.message} where id=${id}`, (err, result) => {
            if (err) {
                res.status(500).send({
                    response: "Ha ocurrido un error actulizando el posts" + err,
                });
            }
            res.status(200).send({
                response: 'success'
            });
        });
    }
}