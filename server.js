const express = require('express');
const app = express();
const path = require('path');
const colors = require('colors');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const axios = require('axios');
const bodyParser = require('body-parser');
const bwipjs = require('bwip-js'); // Import bwip-js for barcode generation

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const PORT = 3000;

const apiKey = 'a84ae5491e01e810a2dfdfb2dc905bfb';
const pass = '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';
const storeDomain = 'f120b7-3.myshopify.com';
const apiVersion = '2023-10';

const graphqlUrl = `https://${apiKey}:${pass}@${storeDomain}/admin/api/${apiVersion}/graphql.json`;
const graphqlQuery = `
  {
    products(first: 10) {
      edges {
        node {
          id
          title
          description
          variants(first: 1) {
            edges {
              node {
                id
                price
                inventoryQuantity
              }
            }
          }
        }
      }
    }
  }
`;

const graphqlMutation = `
  mutation ProductCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        description
        variants {
          edges {
            node {
              id
              price
              inventoryQuantity
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const graphqlConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
};

app.get('/', (req, res) => {
  res.render('products/addProduct');
});

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

app.post('/addDataToShopify', async (req, res) => {
  try {
    const { title, description, price, inventoryQuantity } = req.body;
    const barcodeBuffer = await generateBarcode(title);
    const graphqlVariables = {
      input: {
        title: title,
        descriptionHtml: description,
        variants: [
          {
            price: price,
            inventoryQuantity: inventoryQuantity,
          },
        ],
      },
    };

    const response = await axios.post(
      graphqlUrl,
      {
        query: graphqlMutation,
        variables: graphqlVariables,
      },
      graphqlConfig
    );

    const data = response.data;

    // Pass barcodeBuffer to the HTML rendering
    res.json({ data: data.data, barcode: barcodeBuffer.toString('base64') });
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/fetchDataFromShopify', async (req, res) => {
  try {
    const response = await axios.post(graphqlUrl, { query: graphqlQuery }, graphqlConfig);
    const data = response.data;
    const products = data.data.products.edges.map(edge => edge.node);
    console.log(products[0].variants.edges);
    res.render('products/allProducts', { products });
  } catch (error) {
    handleError(res, error);
  }
});

// Function to generate a barcode using bwip-js
async function generateBarcode(text) {
  return new Promise((resolve, reject) => {
    const options = {
      bcid: 'code128',
      text: text,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
    };

    bwipjs.toBuffer(options, (err, png) => {
      if (err) {
        reject(err);
      } else {
        resolve(png);
      }
    });
  });
}

app.listen(PORT, () =>
  console.log('Server listening at port'.blue, `http://localhost:${PORT}`.red)
);

function handleError(res, error) {
  if (error.response){
    res.status(error.response.status).json(error.response.data);
  } else {
    res.status(500).json({ error: error.message });
  }
}
