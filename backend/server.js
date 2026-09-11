const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const PDFDocument = require("pdfkit");

const app = express();

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "../frontend")));

const DB_FILE = path.join(__dirname, "db.json");


// =====================================================
// BANCO DE DADOS
// =====================================================

function readDB() {

  if (!fs.existsSync(DB_FILE)) {

    return {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: [],
      tv_chamada: null,
      tv_historico: []
    };

  }

  const db = JSON.parse(
    fs.readFileSync(DB_FILE, "utf8")
  );

  if (!db.usuarios) db.usuarios = [];
  if (!db.pacientes) db.pacientes = [];
  if (!db.triagens) db.triagens = [];
  if (!db.consultas) db.consultas = [];

  if (!db.tv_chamada) {
    db.tv_chamada = null;
  }

  if (!db.tv_historico) {
    db.tv_historico = [];
  }

  return db;
}


function writeDB(data) {

  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(data, null, 2)
  );

}


// =====================================================
// LOGIN
// =====================================================

app.post("/login", (req, res) => {

  const db = readDB();

  const user = db.usuarios.find(u =>
    u.usuario === req.body.usuario &&
    u.senha === req.body.senha
  );

  if (!user) {

    return res.status(401).json({
      erro: "Login inválido"
    });

  }

  res.json(user);

});


// =====================================================
// ATENDIMENTO - CADASTRAR PACIENTE
// =====================================================

app.post("/atendimento", (req, res) => {

  const db = readDB();

  const paciente = {

    id: Date.now(),

    nome: req.body.nome,

    cpf: req.body.cpf,

    tipo: req.body.tipo,

    status: "triagem",

    createdAt: new Date()

  };

  db.pacientes.push(paciente);

  writeDB(db);

  res.json(paciente);

});


// =====================================================
// LISTAR PACIENTES
// =====================================================

app.get("/pacientes", (req, res) => {

  const db = readDB();

  res.json(db.pacientes);

});


// =====================================================
// TRIAGEM
// =====================================================

app.post("/triagem", (req, res) => {

  const db = readDB();

  let risco = req.body.risco;


  // Classificação automática pela temperatura

  if (req.body.temperatura >= 39) {

    risco = "vermelho";

  } else if (req.body.temperatura >= 38) {

    risco = "amarelo";

  } else if (!risco) {

    risco = "verde";

  }


  const triagem = {

    id: Date.now(),

    nome: req.body.nome,

    sintoma: req.body.sintoma,

    temperatura: req.body.temperatura,

    alergia: req.body.alergia,

    observacao: req.body.observacao,

    risco: risco,

    status: "aguardando_medico",

    createdAt: new Date()

  };


  db.triagens.push(triagem);

  writeDB(db);

  res.json(triagem);

});


// =====================================================
// LISTAR TRIAGENS
// =====================================================

app.get("/triagens", (req, res) => {

  const db = readDB();

  // Mostra somente quem ainda está aguardando médico

  const triagensAguardando =
    db.triagens.filter(t =>
      t.status === "aguardando_medico"
    );

  res.json(triagensAguardando);

});


// =====================================================
// MÍDIA INDOOR - TV
// =====================================================

app.post("/tv/chamar", (req, res) => {

  const db = readDB();

  const chamada = {

    id: Date.now().toString(),

    localTipo: req.body.localTipo,

    localNumero: req.body.localNumero,

    paciente: req.body.paciente,

    hora: new Date().toLocaleTimeString(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    )

  };


  db.tv_chamada = chamada;

  db.tv_historico.unshift(chamada);


  if (db.tv_historico.length > 5) {

    db.tv_historico.pop();

  }


  writeDB(db);

  res.json(chamada);

});


// =====================================================
// CONSULTAR CHAMADA DA TV
// =====================================================

app.get("/tv/chamada", (req, res) => {

  const db = readDB();

  res.json({

    chamada: db.tv_chamada,

    historico: db.tv_historico

  });

});


// =====================================================
// LISTA DE MEDICAÇÕES
// =====================================================

app.get("/lista-medicacoes", (req, res) => {

  res.json([

    "Dipirona",
    "Paracetamol",
    "Ibuprofeno",
    "Amoxicilina",
    "Azitromicina",
    "Loratadina",
    "Omeprazol",
    "Buscopan",
    "Dramin",
    "Soro fisiológico"

  ]);

});


// =====================================================
// SALVAR CONSULTA
// =====================================================

app.post("/consulta", (req, res) => {

  const db = readDB();

  const {

    paciente,
    diagnostico,
    medicacao,
    obs

  } = req.body;


  // Validação

  if (!paciente) {

    return res.status(400).json({

      erro: "Paciente não informado."

    });

  }


  if (!diagnostico) {

    return res.status(400).json({

      erro: "Diagnóstico não informado."

    });

  }


  if (!medicacao) {

    return res.status(400).json({

      erro: "Medicação não informada."

    });

  }


  // Cria a consulta

  const consulta = {

    id: Date.now(),

    paciente: paciente,

    diagnostico: diagnostico,

    medicacao: medicacao,

    obs: obs || "",

    createdAt: new Date()

  };


  // Salva consulta

  db.consultas.push(consulta);


  // =================================================
  // MARCAR TRIAGEM COMO ATENDIDA
  // =================================================

  const triagem = db.triagens.find(t =>

    t.nome === paciente &&
    t.status === "aguardando_medico"

  );


  if (triagem) {

    triagem.status = "atendido";

    triagem.atendidoEm = new Date();

  }


  // =================================================
  // ATUALIZAR STATUS DO PACIENTE
  // =================================================

  const pacienteBanco = db.pacientes.find(p =>
    p.nome === paciente
  );


  if (pacienteBanco) {

    pacienteBanco.status = "atendido";

  }


  writeDB(db);


  res.json({

    sucesso: true,

    consulta: consulta

  });

});


// =====================================================
// LISTAR CONSULTAS
// =====================================================

app.get("/consultas", (req, res) => {

  const db = readDB();

  res.json(db.consultas);

});


// =====================================================
// BUSCAR UMA CONSULTA
// =====================================================

app.get("/consulta/:id", (req, res) => {

  const db = readDB();

  const id = Number(req.params.id);


  const consulta = db.consultas.find(c =>
    c.id === id
  );


  if (!consulta) {

    return res.status(404).json({

      erro: "Consulta não encontrada."

    });

  }


  res.json(consulta);

});


// =====================================================
// GERAR PDF DA CONSULTA
// =====================================================

app.get("/consulta/:id/pdf", (req, res) => {

  const db = readDB();

  const id = Number(req.params.id);


  const consulta = db.consultas.find(c =>
    c.id === id
  );


  if (!consulta) {

    return res.status(404).send(
      "Consulta não encontrada."
    );

  }


  // -------------------------------------------------
  // CONFIGURAÇÃO DO PDF
  // -------------------------------------------------

  const doc = new PDFDocument({
    size: "A4",
    margin: 50
  });


  const nomeArquivo =
    `consulta-${consulta.id}.pdf`;


  res.setHeader(
    "Content-Type",
    "application/pdf"
  );


  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${nomeArquivo}"`
  );


  // Envia o PDF diretamente para o navegador

  doc.pipe(res);


  // =================================================
  // CABEÇALHO
  // =================================================

  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(
      "PAINEL MÉDICO",
      {
        align: "center"
      }
    );


  doc
    .moveDown(0.5);


  doc
    .fontSize(13)
    .font("Helvetica")
    .text(
      "Relatório de Consulta Médica",
      {
        align: "center"
      }
    );


  doc
    .moveDown(1);


  // Linha

  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();


  doc
    .moveDown(1);


  // =================================================
  // DADOS DA CONSULTA
  // =================================================

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("ID DA CONSULTA:");


  doc
    .font("Helvetica")
    .text(String(consulta.id));


  doc
    .moveDown(0.8);


  doc
    .font("Helvetica-Bold")
    .text("PACIENTE:");


  doc
    .font("Helvetica")
    .text(consulta.paciente);


  doc
    .moveDown(0.8);


  doc
    .font("Helvetica-Bold")
    .text("DATA E HORA:");


  doc
    .font("Helvetica")
    .text(
      new Date(
        consulta.createdAt
      ).toLocaleString("pt-BR")
    );


  doc
    .moveDown(1.5);


  // =================================================
  // DIAGNÓSTICO
  // =================================================

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("Diagnóstico");


  doc
    .moveDown(0.4);


  doc
    .fontSize(11)
    .font("Helvetica")
    .text(
      consulta.diagnostico ||
      "Não informado"
    );


  doc
    .moveDown(1.5);


  // =================================================
  // MEDICAÇÃO
  // =================================================

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("Medicação");


  doc
    .moveDown(0.4);


  doc
    .fontSize(11)
    .font("Helvetica")
    .text(
      consulta.medicacao ||
      "Não informada"
    );


  doc
    .moveDown(1.5);


  // =================================================
  // OBSERVAÇÕES
  // =================================================

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("Observações");


  doc
    .moveDown(0.4);


  doc
    .fontSize(11)
    .font("Helvetica")
    .text(
      consulta.obs ||
      "Nenhuma observação."
    );


  doc
    .moveDown(3);


  // =================================================
  // RODAPÉ
  // =================================================

  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();


  doc
    .moveDown(0.7);


  doc
    .fontSize(9)
    .font("Helvetica")
    .text(
      "Documento gerado pelo sistema hospitalar.",
      {
        align: "center"
      }
    );


  doc
    .text(
      "Consulta registrada eletronicamente.",
      {
        align: "center"
      }
    );


  // Finaliza PDF

  doc.end();

});


// =====================================================
// MEDICAÇÕES / CONSULTAS
// =====================================================

app.get("/medicacoes", (req, res) => {

  const db = readDB();

  res.json(db.consultas);

});


// =====================================================
// START
// =====================================================

const PORT =
  process.env.PORT || 3000;


app.listen(PORT, () => {

  console.log(
    `Servidor rodando na porta ${PORT}`
  );

});
