/**
 * message
 * id_user_send
 * id_posts_reply nullble =0 
 * date
 */
module.exports = {
    get: (con, condition, callback) => {
        con.query("SELECT * FROM posts " + condition, callback);
    },
    getCount: (con, condition, callback) => {
        con.query("SELECT COUNT(*) as count FROM posts " + condition, callback);
    },
    store: (con, data, callback) => {
        con.query(`INSERT INTO posts (message,id_user_send,id_posts_reply,date,id_topics) VALUES('${data.message}',${data.id_user_send},${data.id_posts_reply},'${data.date}',${data.id_topics})`, callback)
    },
    delete: (con, id, callback) => {
        con.query('DELETE from posts where id=' + id, callback);
    },
    update: (con, query, callback) => {
        con.query(query, callback);
    }
}