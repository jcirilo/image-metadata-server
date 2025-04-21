
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { exiftool } = require('exiftool-vendored');
const fs = require('fs');

require('dotenv').config();
const PORT = process.env.PORT || 3001;

const app = express();

app.use(cors({origin: process.env.CORS_ORIGIN || 'http://localhost:5173'}));
app.use(express.static('uploads'));
app.use(express.json());

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const fileFilter = function (req, file, cb) {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'audio/mpeg',
    'video/mp4',
    'video/quicktime', // .mov
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB por arquivo
});

app.post('/upload', upload.single('image'), async (req, res) => {
  const filePath = req.file.path;

  try {
    const metadata = await exiftool.read(filePath);
    res.json({ metadata })

  } catch (err) {
    console.error('Erro ao ler metadados:', err);
    res.status(500).send('Erro ao processar metadados.');
  }
});

app.post('/remove-metadata', async (req, res) => {
  const filePath = "uploads/".concat(req.body.fileName)
  const tags = req.body.tags;

  console.log("nome do arquivo", filePath);
  console.log("tags: ", tags)

  try {

    const tagsFormatted = tags.reduce((acc, tag) => {
      acc[tag] = null
      return acc
    }, {})
    
    await exiftool.write(filePath, tagsFormatted)
    
    res.download(filePath, 'sem_metadados_'.concat(req.body.fileName), (err) => {
      if (err) {
        console.error("Error ao enviar:", err);
        res.status(500).send("Erro ao enviar o arquivo")
      }

      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Erro ao excluir arquivo:', unlinkErr);
        } else {
          console.log('Arquivo excluído com sucesso:', filePath);
        }
      });

    })

  } catch (err) {
    console.error("erro ao remover metadados: ", err);
    res.status(500).send("Erro no servidor de metadados");
  }
});

app.listen(PORT, () => {
  console.log(`rodando na porta ${PORT}`);
});
