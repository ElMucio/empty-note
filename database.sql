CREATE DATABASE IF NOT EXISTS empty_note
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE empty_note;

CREATE TABLE IF NOT EXISTS utenti (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    nome               VARCHAR(100)  NOT NULL,
    cognome            VARCHAR(100)  NOT NULL,
    genere             VARCHAR(20),
    data_nascita       DATE,
    email              VARCHAR(255)  NOT NULL UNIQUE,
    username           VARCHAR(100)  NOT NULL UNIQUE,
    password           VARCHAR(255)  NOT NULL,
    ruolo              ENUM('standard','amministratore') NOT NULL DEFAULT 'standard',
    data_registrazione DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS note (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    utente_id         INT           NOT NULL,
    titolo            VARCHAR(200)  NOT NULL DEFAULT 'Nota senza titolo',
    contenuto_cifrato MEDIUMTEXT,
    iv                VARCHAR(64),
    tag               VARCHAR(64),
    data_creazione    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_modifica     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bacheca (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    titolo        VARCHAR(100) NOT NULL,
    testo         VARCHAR(500) NOT NULL,
    colore        ENUM('giallo','rosa','verde','azzurro') NOT NULL DEFAULT 'giallo',
    ordine        INT          NOT NULL DEFAULT 0,
    data_modifica DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO bacheca (titolo, testo, colore, ordine) VALUES
  ('Editor con formattazione', 'Grassetto, corsivo, sottolineato, colori e allineamento del testo.', 'giallo',  1),
  ('Ricerca rapida',           'Trovi subito la nota che cerchi grazie alla barra di ricerca.',      'rosa',    2),
  ('Doppia visualizzazione',   'Vedi le tue note a lista o a card, come preferisci.',                'verde',   3),
  ('Esporta le note',          'Scarichi una nota sul dispositivo e la conservi in locale.',         'azzurro', 4),
  ('Accesso sicuro',           'Password protette e contenuto delle note cifrato nel database.',     'giallo',  5),
  ('Novita!',                  'Ora puoi scaricare le tue note con un solo clic.',                   'rosa',    6);

-- Nessun amministratore predefinito: si crea con
--   node crea-admin.js <username> <email> <password>
