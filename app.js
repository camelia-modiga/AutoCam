const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const fs = require('fs');

const app = express();
app.use(cookieParser());
app.use(session({ secret: 'ssshhhhh', saveUninitialized: true, resave: true }));

var sess;
const port = 6789;

app.set('view engine', 'ejs');
app.use(expressLayouts);
app.use(express.static('public'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


var mysql = require('mysql');


var con = mysql.createConnection({
    host: "localhost",
    user: "cami",
    password: "cami",
    insecureAuth: true,
    database: 'inchirieri',
    dateStrings: true
});

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});


app.get('/', (req, res) => {
    if (req.session.username != null) {
        res.render('index', { mesaj: req.session.prenume, log: req.session.username });
        return;
    } else {

        res.render('index', { mesaj: req.session.prenume, log: ' ' });
    }
});

app.get('/despre', (req, res) => {
    res.render('despre');
});


app.get('/masini', (req, res) => {
    var sql = 'SELECT * FROM masini';
    con.query(sql, function(err, data, fields) {
        if (err) throw err;
        if (req.session.username != null) {
            res.render('masini', { mesaj: req.session.prenume, log: req.session.email, listResults: data });
            return;
        } else {

            res.render('masini', { mesaj: req.session.prenume, log: ' ', listResults: data });
        }
    });
});

app.get('/contact', (req, res) => {
    res.render('contact');
});

app.get('/autentificare', (req, res) => {
    sess = req.session.username;
    res.clearCookie('mesajEroare', 'Date gresite!!');
    res.clearCookie('utilizator', req.session.username);
    res.render('autentificare', { mesaj: req.cookies['mesajEroare'], utilLogat: req.session.username });
});



app.post('/verificare-autentificare', (req, res) => {

    const username = req.body.username;
    const pass = req.body.parola;
    sess = req.session;
    fs.readFile('utilizatori.json', (err, data) => {
        if (err) {
            console.log(err);
        }
        const listaUtilizatori = JSON.parse(data);
        var ok = 0;
        for (var i = 0; i < listaUtilizatori.length; i++) {
            if (listaUtilizatori[i].email == username && listaUtilizatori[i].parola == pass) {
                ok = 1;
                sess.username = listaUtilizatori[i].email;
                sess.numeUtilizator = listaUtilizatori[i].nume;
                sess.prenume = listaUtilizatori[i].prenume;

                res.cookie('utilizator', username);
                res.redirect(302, '/');
                res.end();
            }
        }
        if (ok == 0) {
            res.cookie('mesajEroare', 'Date gresite!!');
            res.redirect(302, '/autentificare');
            res.end();
        }
    });
});

var array = [];
app.post('/salveaza_utilizatori', function(req, res) {
    fs.readFile('utilizatori.json', (err, data) => {
        if (err) {
            console.log(err);
        } else {

            array = JSON.parse(data);
            array.push(req.body);
            var json = JSON.stringify(array);
            console.log(json);

            fs.writeFile("utilizatori.json", json, 'utf8', function(err) {
                if (err) {
                    console.log(err);
                }
                res.redirect(302, '/autentificare');
            });
        }
    });

});

app.get('/cont_nou', (req, res) => {
    res.render('cont_nou');
});



app.get('/delogare', (req, res) => {
    res.cookie('utilizator', '', { maxAge: 0 });
    req.session.username = null;
    req.session.prenume = null;
    res.redirect(302, 'http://localhost:6789/');
});


app.post('/rezerva', (req, res) => {
    var id_masina = req.body.id;
    var tarif = req.body.tarif;
    var marca = req.body.marca;
    res.render('rezerva', { id: id_masina, tarif: tarif, masina_selectata: marca, mesaj_eroare: ' ' });
});


app.post('/dotari', (req, res) => {
    var id_masina = req.body.id;
    var tarif = req.body.tarif;
    var marca = req.body.masina_selectata;
    var locatie_preluare = req.body.locatie1;
    var locatie_predare = req.body.locatie2;
    var data_retur = req.body.predare;
    var data_inchiriere = req.body.inchiriere;
    if (locatie_preluare == "") {
        res.render('rezerva', { id: id_masina, tarif: tarif, masina_selectata: marca, mesaj_eroare: 'Trebuie să alegeți locația de preluare!!' });
    } else if (locatie_predare == "") {
        res.render('rezerva', { id: id_masina, tarif: tarif, masina_selectata: marca, mesaj_eroare: 'Trebuie să alegeți locația de predare!!' });
    } else if (data_inchiriere > data_retur) {
        res.render('rezerva', { id: id_masina, tarif: tarif, masina_selectata: marca, mesaj_eroare: 'Data de închiriere trebuie să fie mai mică decât data de retur!!' });
    } else {
        con.query('SELECT max(data_retur) as data from contracte_inchirieri where id_masina = ?', [id_masina], function(err, data) {
            if (err) throw err;

            var resultArray = JSON.parse(JSON.stringify(data));
            if (data_inchiriere < resultArray[0].data) {
                res.render('rezerva', { id: id_masina, tarif: tarif, masina_selectata: marca, mesaj_eroare: 'Mașina nu a fost returnată la data de ' + data_inchiriere });
            } else {
                con.query('SELECT * FROM dotari', function(err, data) {
                    if (err) throw err;
                    res.render('dotari', { listResults: data, id: id_masina, tarif: tarif, masina_selectata: marca, locatie_preluare: locatie_preluare, locatie_predare: locatie_predare, data_retur: data_retur, data_inchiriere: data_inchiriere });
                });
            }
        });
    }
});


app.post('/finalizeaza-rezervare', (req, res) => {
    var id_masina = req.body.id;
    var tarif = req.body.tarif;
    var masina_selectata = req.body.masina_selectata;
    var locatie_preluare = req.body.locatie_preluare;
    var locatie_predare = req.body.locatie_predare;
    var data_inchiriere = req.body.data_inchiriere;
    var data_retur = req.body.data_retur;
    var tarif_dotare = req.body.tarif_dotare;
    var prenume = req.session.prenume;

    var Difference_In_Time = new Date(data_retur).getTime() - new Date(data_inchiriere).getTime();
    var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);

    var tarif_total = Difference_In_Days * (Number(tarif_dotare) + Number(tarif));
    var tarif_total_dotare = Difference_In_Days * Number(tarif_dotare);

    var sql = "insert into contracte_inchirieri (data_inchiriere,data_retur,id_masina,locatie_preluare,locatie_returnare,masina_selectata,nume_client,tarif,tarif_dotari) values (?,?,?,?,?,?,?,?,?)";
    con.query(sql, [data_inchiriere, data_retur, id_masina, locatie_preluare, locatie_predare, masina_selectata, prenume, tarif_total, tarif_total_dotare], function(err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);

        con.query('SELECT * FROM contracte_inchirieri where data_inchiriere=? and data_retur=? and id_masina=?', [data_inchiriere, data_retur, id_masina], function(err, data) {
            if (err) throw err;
            res.render('finalizeaza-rezervare', { listResults: data });
        });
    });
});


app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));