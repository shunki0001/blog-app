const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Tomo0204',
    database: 'blog_app'
});

app.use(
    session({
        secret: 'my_secret_key',
        resave: false,
        saveUninitialized: false,
    })
)

app.use((req, res, next) => {
    if (req.session.userId === undefined) {
        res.locals.username = 'ゲスト';
        res.locals.isLoggedIn = false;
    } else {
        res.locals.username = req.session.username;
        res.locals.isLoggedIn = true;
    }
    next();
});

//トップページ
app.get('/', (req, res) => {
    res.render('top.ejs');
});

//ブログ一覧
app.get('/list', (req, res) => {
    
    connection.query(
        'SELECT * FROM articles',
        (error, results) => {
            res.render('list.ejs', { articles: results});
        }
    );
});

//ブログ単数表示
app.get('/article/:id', (req, res) => {
    const id = req.params.id;
    connection.query(
        'SELECT * FROM articles WHERE id = ?',
        [id],
        (error, results) => {
            res.render('article.ejs', { article: results[0]});
        }
    );
});

//アカウント作成
app.get('/signup', (req, res) => {
    res.render('signup.ejs', { errors: [] });
});

app.post('/signup',
    (req, res, next) => {
        console.log('入力値の空チェック');

        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;

        const errors = [];

        if (username === '') {
            errors.push('ユーザー名が空です');
        }
        if (email === '') {
            errors.push('メールアドレスが空です');
        }
        if (password === '') {
            errors.push('パスワードが空です');
        }

        console.log(errors);

        if (errors.length > 0) {
            res.render('signup.ejs', { errors: errors });
        } else {
            next();
        }

    },

    (req, res, next) => {
        console.log('メールアドレスの重複チェック');
        const email = req.body.email;
        const errors = [];

        connection.query(
            'SELECT * FROM users WHERE email = ?',
            [email],
            (error, results) => {
                if (results.length > 0) {
                    errors.push('ユーザー登録に失敗しました');
                    res.render('signup.ejs', { errors: errors });
                } else {
                    next();
                }
            }
        );
    },

    (req, res) => {
        console.log('ユーザー登録');
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;
        bcrypt.hash(password, 10, (error, hash) => {
            connection.query(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [username, email, hash],
                (error, results) => {
                    req.session.userId = results.insertId;
                    req.session.username = username;
                    res.redirect('/list');
                }
            );
        });
    }
);

//ログインページ
app.get('/login', (req, res) => {
    res.render('login.ejs', { errors: [] });
});

app.post('/login',
    (req, res, next) => {
        console.log('入力値の空チェック');
        const email = req.body.email;
        const password = req.body.password;
        const errors = [];

        if (email === '') {
            errors.push('メールアドレスが空です');
        }
        if (password === '') {
            errors.push('パスワードが空です');
        }
        console.log(errors);

        if (errors.length > 0) {
            res.render('login.ejs', { errors: errors });
        } else {
            next();
        }
    },
    //メールアドレス、パスワード不一致の場合エラーのnext関数
    (req, res, next) => {
        console.log('入力値の一致チェック');
        const email = req.body.email;
        const password = req.body.password;
        const errors = [];
        //データベースから検索をしてその値から比較をすれば？
        if(email != email) {
            errors.push('メールアドレスが一致しません');
        }
        if (password != password) {
            errors.push('パスワードが一致しません');
        }
        console.log(errors);

        if (errors.lenght > 0) {
            res.render('login.ejs', { errors: errors});
        } else {
            next();
        }
    },

    (req, res) => {
        console.log('ユーザーログイン');
        const email = req.body.email;

        connection.query(
            'SELECT * FROM users WHERE email = ?',
            [email],
            (error, results) => {
                if (results.length > 0) {
                const plain = req.body.password;
                const hash = results[0].password;
                bcrypt.compare(plain, hash, (error, isEqual) => {
                    if (isEqual) {
                        req.session.userId = results[0].id;
                        req.session.username = results[0].username;
                        res.redirect('/list');
                    } else {
                        res.redirect('/list');
                    }
                });
             
                } else {
                res.redirect('/login');
                } 
            }
        );
    }
);

//ログアウト
app.get('/logout', (req, res) => {
    req.session.destroy((error) => {
        res.redirect('/list');
    });
});

//記事を新しく作る
app.get('/new', (req, res) => {
    res.render('new.ejs', { errors: [] });
});

app.post('/create', 
    (req, res, next) => {
        console.log('入力値の空チェック');
        const title = req.body.title;
        const summary = req.body.summary;
        const content = req.body.content;
        const category = req.body.category;

        const errors = [];

        if (title === '') {
            errors.push('タイトルが未入力です');
        }
        if (summary === '') {
            errors.push('題名が未入力です');
        }
        if (content === '') {
            errors.push('本文が未入力です');
        }
        if (category === '') {
            errors.push('カテゴリーが未入力です');
        }
        console.log(errors);
        if (errors.length > 0) {
            res.render('new.ejs', { errors: errors });
        } else {
            next();
        }
    },
    (req, res) => {
        const title = req.body.title;
        const summary = req.body.summary;
        const content = req.body.content;
        const category = req.body.category;

        connection.query(
            'INSERT INTO articles (title, summary, content, category) VALUES (?, ?, ?, ?)',
            [title, summary, content, category],
            (error, results) => {
                res.redirect('/list');
            }
        );
    }
);

//記事を削除
app.post('/delete/:id', (req, res) => {
    connection.query(
        'DELETE FROM articles WHERE id = ?',
        [req.params.id],
        (error, results) => {
            res.redirect('/list');
        }
    );
});

//編集者ログイン
app.get('/editer_login', (req, res) => {
    res.render('editer_login.ejs', {errors: [] });
});

app.post('/editer_login',
    (req, res, next) => {
        console.log('入力値の空チェック');
        const email = req.body.email;
        const password = req.body.password;
        const errors = [];

        if (email === '') {
            errors.push('メールアドレスが空です');
        }
        if (password === '') {
            errors.push('パスワードが空です');
        }
        console.log(errors);

        if (errors.length > 0) {
            res.render('editer_login.ejs', { errors: errors });
        } else {
            next();
        }
    },
    (req, res) => {
        console.log('ユーザーログイン');
        const email = req.body.email;

        connection.query(
            'SELECT * FROM users WHERE email = ?',
            [email],
            (error, results) => {
                if (results.length > 0) {
                    const plain = req.body.password;
                    const hash = results[0].password;

                    bcrypt.compare(plain, hash, (error, isEqual) => {
                        if (isEqual) {
                            req.session.userId = results[0].id;
                            req.session.username = results[0].username;
                            res.redirect('/edit');
                        } else {
                            res.redirect('/editer_login');
                        }
                    });
                } else {
                    res.redirect('/editer_login');
                }
            }
        );
    }
);

//編集ページ
app.get('/edit', (req, res) => {
    connection.query(
        'SELECT * FROM articles',
        (error, results) => {
            res.render('edit.ejs', { articles: results});
        }
    );
});

//記事編集
app.get('/editer/:id', (req, res) => {
    connection.query(
        'SELECT * FROM articles WHERE id =?',
        [req.params.id],
        (error, results) => {
            res.render('editer.ejs', { articles: results[0] });
        }
    );
});

//記事更新
app.post('/update/:id', (req, res) => {
    const title = req.body.title;
    const summary = req.body.summary;
    const content = req.body.content;
    const category = req.body.category;
    const id = req.params.id;

    connection.query(
        'UPDATE articles SET title = ?, summary = ?, content = ?, category = ? WHERE id = ?',
        [title, summary, content, category, id],
        (error, results) => {
            res.redirect('/edit');
        }
    );
});

app.listen(3000);

//編集ページ、専用アカウントでログインをできるようにする。
// カテゴリーの入力を制限する
//ログイン失敗のエラーを表示⇨パスワードの重複チェック⇨一致しない場合はエラーを表示させる。