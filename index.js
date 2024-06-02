
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
// const { port } = require('./config');
// const { sequelize, Album, Cancion, Usuario } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'your_jwt_secret_key';

app.use(bodyParser.json());

// const port = process.env.PORT || 3000
const host = process.env.host || 'localhost'
const user = process.env.user || 'root'
const password = process.env.password || 'Dima.zdla1'
const database = process.env.database || 'sputyfy'
// const dbport = process.env.dbport || 3306
const dbport = PORT
// Configuración de la base de datos
/*
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 10000 // Tiempo de espera ajustado a 10 segundos
});
*/
const connection = mysql.createConnection({
    port:dbport,
    host:host, 
    user:user, 
    password:password, 
    database:database
})

connection.connect(err => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conectado a la base de datos.');
});

// Configuración de Swagger
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Sputyfy API',
            version: '1.0.0',
            description: 'API de Sputyfy para gestionar usuarios, álbumes y canciones'
        },
        servers: [
            {
                url: `http://localhost:${PORT}`
            }
        ]
    },
    apis: ['./index.js'], // Asegúrate de que el nombre del archivo sea correcto
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.sendStatus(401);
    
    console.log('Token:', req.headers.authorization);
    try{
        jwt.verify(token, SECRET_KEY, (err) => {
            if (err) return res.sendStatus(403);
            // req.user = user;
            next();
        });
    }catch (err){
        res.json({error:err})
    }
    
};

/**
 * @swagger
 * /usuarios/{nombre}:
 *   get:
 *     summary: Obtener un usuario por nombre
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: nombre
 *         schema:
 *           type: string
 *         required: true
 *         description: Nombre del usuario
 *     responses:
 *       200:
 *         description: Datos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 idUsuario:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *                 pass:
 *                   type: string
 *                 nivel:
 *                   type: integer
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error al buscar el usuario
 */
app.get('/usuarios/:nombre', (req, res) => {
    const { nombre } = req.params;

    const query = 'SELECT * FROM usuario WHERE nombre = ?';
    connection.query(query, [nombre], (err, results) => {
        if (err) {
            console.error('Error al buscar el usuario:', err);
            return res.status(500).json({ error: 'Error al buscar el usuario' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(results[0]);
    });
});




/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               pass:
 *                 type: string
 *               nivel:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *                 nivel:
 *                   type: integer
 *       500:
 *         description: Error al registrar el usuario
 */
app.post('/register', (req, res) => {
    const { nombre, pass, nivel } = req.body;
    const hashedPassword = bcrypt.hashSync(pass, 8);

    const query = 'INSERT INTO usuario (nombre, pass, nivel) VALUES (?, ?, ?)';
    connection.query(query, [nombre, hashedPassword, nivel], (err, results) => {
        if (err) {
            console.error('Error al registrar el usuario:', err);
            return res.status(500).json({ error: 'Error al registrar el usuario' });
        }
        res.json({ id: results.insertId, nombre, nivel });
    });
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Autenticar un usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               pass:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuario autenticado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Contraseña incorrecta
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error al buscar el usuario
 */
app.post('/login', (req, res) => {
    const { nombre, pass } = req.body;
    try {
        const query = 'SELECT * FROM usuario WHERE nombre = ?';
    connection.query(query, [nombre], (err, results) => {
        if (err) {
            console.error('Error al buscar el usuario:', err);
            return res.status(500).json({ error: 'Error al buscar el usuario' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = results[0];
        const validPassword = bcrypt.compareSync(pass, user.pass);
        if (!validPassword) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        const token = jwt.sign({ id: user.idUsuario, nombre: user.nombre }, SECRET_KEY, { expiresIn: '25d' });
        res.json({ token });
    });
    } catch (error) {
        console.log(error)
    }
    
});

/**
 * @swagger
 * /compare:
 *   post:
 *     summary: Comparar los valores recibidos con los valores en la base de datos
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               pass:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resultado de la comparación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error al buscar el usuario
 */
app.post('/compare', (req, res) => {
    const { nombre, pass } = req.body;

    const query = 'SELECT * FROM usuario WHERE nombre = ?';
    connection.query(query, [nombre], (err, results) => {
        if (err) {
            console.error('Error al buscar el usuario:', err);
            return res.status(500).json({ error: 'Error al buscar el usuario' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = results[0];
        const validPassword = bcrypt.compareSync(pass, user.pass);
        if (validPassword) {
            res.json({ message: 'si entra' });
        } else {
            res.json({ message: 'no se puede entrar' });
        }
    });
});



/**
 * @swagger
 * /album:
 *   post:
 *     summary: Crear un nuevo álbum
 *     tags: [Álbumes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *     responses:
 *       200:
 *         description: Álbum creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *       500:
 *         description: Error al crear el álbum
 */
app.post('/album', authenticateToken, (req, res) => {
    const { nombre } = req.body;

    const query = 'INSERT INTO album (nombre) VALUES (?)';
    connection.query(query, [nombre], (err, results) => {
        if (err) {
            console.error('Error al crear el álbum:', err);
            return res.status(500).json({ error: 'Error al crear el álbum' });
        }
        res.json({ id: results.insertId, nombre });
    });
});

/**
 * @swagger
 * /cancion:
 *   post:
 *     summary: Crear una nueva canción
 *     tags: [Canciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Titulo:
 *                 type: string
 *               Artista:
 *                 type: string
 *               Albumid:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Canción creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 Titulo:
 *                   type: string
 *                 Artista:
 *                   type: string
 *                 Albumid:
 *                   type: integer
 *       500:
 *         description: Error al crear la canción
 */
app.post('/cancion', authenticateToken, (req, res) => {
    const { Titulo, Artista, Albumid } = req.body;

    const query = 'INSERT INTO cancion (Titulo, Artista, Albumid) VALUES (?, ?, ?)';
    connection.query(query, [Titulo, Artista, Albumid], (err, results) => {
        if (err) {
            console.error('Error al crear la canción:', err);
            return res.status(500).json({ error: 'Error al crear la canción' });
        }
        res.json({ id: results.insertId, Titulo, Artista, Albumid });
    });
});

/**
 * @swagger
 * /canciones:
 *   get:
 *     summary: Obtener todas las canciones
 *     tags: [Canciones]
 *     responses:
 *       200:
 *         description: Lista de canciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   Titulo:
 *                     type: string
 *                   Artista:
 *                     type: string
 *                   Albumid:
 *                     type: integer
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error al obtener las canciones
 */
app.get('/canciones', authenticateToken, (req, res) => {
    const query = 'SELECT * FROM cancion';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener las canciones:', err);
            return res.status(500).json({ error: 'Error al obtener las canciones' });
        }
        res.json(results);
    });
});

/**
 * @swagger
 * /cancion/{id}:
 *   put:
 *     summary: Modificar una canción existente
 *     tags: [Canciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la canción
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Titulo:
 *                 type: string
 *               Artista:
 *                 type: string
 *               Albumid:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Canción modificada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 Titulo:
 *                   type: string
 *                 Artista:
 *                   type: string
 *                 Albumid:
 *                   type: integer
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Canción no encontrada
 *       500:
 *         description: Error al modificar la canción
 */
app.put('/cancion/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { Titulo, Artista, Albumid } = req.body;

    const query = 'UPDATE cancion SET Titulo = ?, Artista = ?, Albumid = ? WHERE idCancion = ?';
    connection.query(query, [Titulo, Artista, Albumid, id], (err, results) => {
        if (err) {
            console.error('Error al modificar la canción:', err);
            return res.status(500).json({ error: 'Error al modificar la canción' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Canción no encontrada' });
        }
        res.json({ id, Titulo, Artista, Albumid });
    });
});

/**
 * @swagger
 * /cancion/{id}:
 *   delete:
 *     summary: Eliminar una canción existente
 *     tags: [Canciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la canción
 *     responses:
 *       200:
 *         description: Canción eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Canción no encontrada
 *       500:
 *         description: Error al eliminar la canción
 */
app.delete('/cancion/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM cancion WHERE idCancion = ?';
    connection.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error al eliminar la canción:', err);
            return res.status(500).json({ error: 'Error al eliminar la canción' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Canción no encontrada' });
        }
        res.json({ message: 'Canción eliminada exitosamente' });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
