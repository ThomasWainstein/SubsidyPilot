# API Les-Aides.fr - Documentation Complète

**Contact API OpenData**  
Thomas Wainstein <thomaswainstein@gmail.com>  
**IDC**: `711e55108232352685cca98b49777e6b836bfb79`

---

## 1. Introduction

L'API les-aides.fr permet d'interroger la base Sémaphore en mode Web Service.

### 1.1 Méthode d'accès

Les appels utilisent le protocole HTTP ou HTTPS, en utilisant la méthode POST ou GET.

**Exemple 1 (méthode GET):**
```http
GET /aides/?domaine=790&ape=6201Z&departement=80 HTTP/1.0
Host: api.les-aides.fr
Accept: application/json
Accept-Encoding: gzip
Authorization: Basic 0123456789abcdABCD
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:41.0) API les-aides.fr
```

**Exemple 2 (méthode POST):**
```http
POST /aides/ HTTP/1.0
Host: api.les-aides.fr
Accept: application/json
Accept-Encoding: gzip
X-IDC: 0123456789abcd0123456789abcd
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:41.0) API les-aides.fr
Content-Length: 36

domaine=790&ape=6201Z&departement=80
```

### 1.2 Configuration de l'entête HTTP

#### Champ "Accept" (obligatoire)
Indique le format de contenu souhaité:
- `application/json` (ou `text/json`) : JSON (défaut)
- `application/javascript` (ou `text/javascript`) : JSONP
- `application/csv` (ou `text/csv`) : Format CSV
- `text/plain` : Texte brut
- `text/html` : Format HTML

**Alternative via paramètre URL:**
```
https://api.les-aides.fr/liste/communes/?departement=80&format=csv
```
Valeurs possibles: `json`, `jsonp`, `html`, `text`, `csv`

#### Champ "Accept-Encoding" (souhaitable)
- `gzip` : Compression GZIP
- `deflate` : Compression Deflate

#### Champ "Authorization" ou "X-IDC" (obligatoire)

**Format Authorization:**
```http
Authorization: Basic 0123456789abcdABCD
```
où `0123456789abcdABCD` est l'encodage base64 de `nom_utilisateur:mot_de_passe`

**Format X-IDC:**
```http
X-IDC: 0123456789abcdef0123456789abcdef
```

**Alternative via paramètre URL:**
```html
<script type="text/javascript"
src="https://api.les-aides.fr/liste/filieres/?idc=0123456789abcdef0123456789abcdef&format=jsonp&callback=listeFilieres">
</script>
```

### 1.3 Paramètres d'appel communs

#### Authentification
- **HTTP classique:** `Authorization: Basic [base64]`
- **Variable HTTP:** `X-IDC: [clef]`
- **Paramètre GET/POST:** `idc=[clef]`

#### Format JSONP
Pour l'utilisation en JSONP:
- Paramètre `callback` requis
- Authentification via paramètre `idc`
- Format spécifié avec `format=jsonp`

**Exemple:**
```html
<script type="text/javascript"
src="https://api.les-aides.fr/liste/moyens/?idc=0123456789abcdef0123456789abcdef&format=jsonp&callback=listeMoyens">
</script>
```

**Résultat:**
```javascript
listeMoyens([
  {"numero":13,"libelle":"Moyens financiers"},
  {"numero":15,"libelle":"Allègement des charges sociales et fiscales"},
  {"numero":14,"libelle":"Prestations spécialisées"},
  {"numero":563,"libelle":"Fourniture de moyens et d'informations"}
]);
```

### 1.4 Réponses HTTP

#### Code 200 - Succès
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=UTF-8
Content-Encoding: gzip

{"idr":3951541,"depassement":false,"nb_dispositifs":99,"dispositifs":...}
```

#### Code 401 - Non authentifié
Renvoyé si `Authorization` ou `X-IDC` manquants.

#### Code 403 - Erreur d'appel
```json
{
  "exception":"L'APE n'existe pas ou est mal paramétrée",
  "api":"/aides",
  "field":"ape",
  "args":{"domaine":790,"ape":"ZZZZ"}
}
```

#### Code 404 - Contenu inexistant
Service ne peut pas renvoyer de contenu.

#### Code 302 - Redirection HTML
Le champ `Location` contient l'URL du contenu HTML.

### 1.5 Restriction d'accès
**Limite:** 720 accès quotidiens maximum.
Pour des besoins supérieurs, contact: les-aides.fr@amiens-picardie.cci.fr

---

## 2. Recherche d'aides

**Endpoint:** `https://api.les-aides.fr/aides/`

### 2.1 Critères de recherche

#### Recherche par entreprise connue
Si SIRET/SIREN connu:
```
https://api.les-aides.fr/aides/?siret=12345678901234&domaine=798
https://api.les-aides.fr/aides/?siren=123456789&domaine=798
```

#### Critères obligatoires

**Variable "ape"** - Activité de l'entreprise
- Codes NAF 5 niveaux (A, B, C... ou codes complets)
- Exemple: `https://api.les-aides.fr/aides/?ape=6201Z&domaine=798`

**Variable "domaine"** - Domaine d'application
- Valeurs de la liste des domaines d'application
- Exemple: `https://api.les-aides.fr/aides/?ape=J&domaine=798`
- Multi-domaines: `domaine=[790,793]` ou `domaine[]=790&domaine[]=793`

#### Critères optionnels

**Variables de localisation:**
- `region` : Identifiant région
- `departement` : Code département  
- `commune` : Code commune

**Autres critères:**
- `moyen` : Moyen d'intervention (multi-valeurs supportées)
- `filiere` : Filière marché
- `siret`/`siren` : Codes entreprise

#### Reprise de recherche
```
https://api.les-aides.fr/aides/?requete=123456
https://api.les-aides.fr/aides/?requete=123456&filiere=337
```

### 2.2 Résultat de recherche

#### Objet "resultat"
```json
{
  "idr": 123456,
  "depassement": false,
  "nb_dispositifs": 42,
  "date": "2024-01-15 14:30:00",
  "dispositifs": [...],
  "etablissement": {...},
  "localisation": {...}
}
```

#### Objet "dispositif"
```json
{
  "numero": 12345,
  "nom": "Nom du dispositif",
  "sigle": "ORGANISME",
  "revision": 1.5,
  "generation": "2024-01-01",
  "validation": "2024-01-15",
  "nouveau": true,
  "implantation": "N",
  "uri": "https://les-aides.fr/aide/...",
  "aps": false,
  "domaines": [790, 798],
  "moyens": [827, 833],
  "resume": "Description courte..."
}
```

---

## 3. Valeurs des paramètres de recherche

**Base URL:** `https://api.les-aides.fr/liste/`

### 3.1 Activité de l'entreprise
**Endpoint:** `/liste/naf`

Structure arborescente NAF INSEE à 5 niveaux:
```json
[
  {
    "code": "A",
    "libelle": "Agriculture, sylviculture et pêche",
    "activites": [
      {
        "code": "01",
        "libelle": "Culture et production animale...",
        "activites": [...]
      }
    ]
  }
]
```

### 3.2 Filière marché  
**Endpoint:** `/liste/filieres`
```json
[
  {"numero": 336, "libelle": "Artisanat"},
  {"numero": 335, "libelle": "Economie Sociale et Solidaire"},
  {"numero": 337, "libelle": "Métiers de bouche"}
]
```

### 3.3 Région d'implantation
**Endpoint:** `/liste/regions`
```json
[
  {"region": 42, "nom": "Alsace"},
  {"region": 72, "nom": "Aquitaine"},
  {"region": 83, "nom": "Auvergne"}
]
```

### 3.4 Département d'implantation  
**Endpoint:** `/liste/departements`
```json
[
  {"departement": "01", "nom": "Ain"},
  {"departement": "02", "nom": "Aisne"},
  {"departement": "03", "nom": "Allier"}
]
```

### 3.5 Commune d'implantation
**Endpoint:** `/liste/communes?departement=01`
```json
[
  {
    "departement": "01",
    "numero": 1,
    "insee": "01001", 
    "article": "L'",
    "nom": "Abergement-Clémenciat"
  }
]
```

### 3.6 Domaine d'application de l'aide
**Endpoint:** `/liste/domaines`
```json
[
  {"numero": 790, "libelle": "Création Reprise"},
  {"numero": 793, "libelle": "Cession Transmission"},
  {"numero": 798, "libelle": "Développement commercial"}
]
```

### 3.7 Moyen d'intervention de l'aide
**Endpoint:** `/liste/moyens`  
```json
[
  {"numero": 822, "libelle": "Intervention en fonds propres"},
  {"numero": 827, "libelle": "Avance − Prêts − Garanties"},
  {"numero": 833, "libelle": "Subvention"}
]
```

---

## 4. Fiche d'aide

**Endpoint:** `https://api.les-aides.fr/aide/`

### 4.1 Chargement de fiches

Après une recherche aboutie:
```
https://api.les-aides.fr/aide/?requete=123456&dispositif=23456
```

**Paramètres:**
- `requete` : Identifiant de requête (champ `idr`) - **obligatoire**
- `dispositif` : Identifiant du dispositif (champ `numero`) - **obligatoire**

### 4.2 Format d'une fiche d'aide

#### Objet "ficheDispositif" 
Hérite de l'objet "dispositif" avec champs additionnels:

```json
{
  "numero": 12345,
  "nom": "Nom du dispositif",
  "auteur": "Nom gestionnaire",
  "organisme": {...},
  "objet": "<HTML>Présentation du dispositif</HTML>",
  "conditions": "<HTML>Conditions d'attribution</HTML>",
  "montants": "<HTML>Montant de l'aide</HTML>",
  "conseils": "<HTML>Informations pratiques</HTML>",
  "references": "<HTML>Sources et références légales</HTML>",
  "cci": [...],
  "restrictions": [...],
  "criteres": {
    "pour": [...],
    "contre": [...]
  },
  "particularites": [...],
  "conseil": "<HTML>Conseils subsidiaires</HTML>",
  "responsabilites": "<HTML>Limites de responsabilité</HTML>"
}
```

#### Objet "organisme"
```json
{
  "numero": 123,
  "sigle": "ORGANISME",
  "raison_sociale": "Nom complet organisme",
  "implantation": "N",
  "adresses": [
    {
      "libelle": "Adresse principale",
      "interlocuteur": "Nom contact",
      "adresse": "Adresse postale",
      "email": "contact@organisme.fr",
      "service": "Nom du service",
      "telephone": "01.23.45.67.89",
      "telecopie": "01.23.45.67.90",
      "web": "https://organisme.fr"
    }
  ]
}
```

---

## Notes d'implémentation

### Authentification recommandée
Utiliser l'IDC dans l'entête `X-IDC` pour les appels programmatiques:
```javascript
headers: {
  'X-IDC': '711e55108232352685cca98b49777e6b836bfb79',
  'Accept': 'application/json',
  'Accept-Encoding': 'gzip',
  'User-Agent': 'Mozilla/5.0 API les-aides.fr'
}
```

### Gestion des erreurs
Toujours vérifier:
1. Code HTTP de réponse
2. Champ `exception` en cas d'erreur 403
3. Champ `depassement` dans les résultats de recherche

### Rate Limiting
- Maximum 720 requêtes/jour
- Implémenter des delays entre appels
- Gérer les erreurs 429 si implémentées côté serveur

### Bonnes pratiques
1. Utiliser la compression gzip
2. Mettre en cache les listes de référence
3. Réutiliser les `idr` pour les recherches similaires
4. Valider les paramètres avant l'appel API