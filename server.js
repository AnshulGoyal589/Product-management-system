const express = require('express');
const app = express();
const path = require('path');
const colors = require('colors');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const axios = require('axios');
const bodyParser = require('body-parser');
const fs = require('fs'); // Import fs for writing barcode image to file
const bwipjs = require('bwip-js'); // Import bwip-js for barcode generation

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const PORT = 3000;

let to=2;
let co=1;
let po=0;

const apiKey = 'a84ae5491e01e810a2dfdfb2dc905bfb'; 
const pass = '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';
const storeDomain = 'f120b7-3.myshopify.com';
const apiVersion = '2023-10';
const images=['https://i0.wp.com/made2automate.com/wp-content/uploads/2023/07/Baumer-Double-sheet-detection-made-simple-with-ultrasonic-sensors-ML-20200921-PH.webp?resize=1536%2C1126&ssl=1',
'https://i0.wp.com/made2automate.com/wp-content/uploads/2023/07/industrial-sensors.webp?w=1000&ssl=1',
'https://i0.wp.com/made2automate.com/wp-content/uploads/2023/07/8948939083_8df33b32e3_b.webp?w=1024&ssl=1',
'https://i0.wp.com/made2automate.com/wp-content/uploads/2023/07/Wenglor-sensors-jpg.webp?w=1280&ssl=1',
'https://i0.wp.com/made2automate.com/wp-content/uploads/2023/05/4-18.webp?fit=600%2C600&ssl=1',
'https://i0.wp.com/made2automate.com/wp-content/uploads/2023/05/2-3.webp?resize=300%2C300&ssl=1',
'https://i0.wp.com/made2automate.com/wp-content/uploads/2023/05/2-46.webp?resize=300%2C300&ssl=1',
'https://i0.wp.com/made2automate.com/wp-content/uploads/2023/05/1-23.webp?resize=300%2C300&ssl=1',
'https://i0.wp.com/made2automate.com/wp-content/uploads/2023/05/3-13.webp?resize=300%2C300&ssl=1'


];
const brcodes=[
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQe790-8gTi3pMqTF6ztBTJ7dFkQrA1Ahf_nnIw0JNbKeNaAFTASROlc8oGknvxjLWptUk&usqp=CAU',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcReMH4Cd3NPitsdQ0Y1a6z0Gh0zFjG4SaG9_Sg2XFiv78qOrxcwtbx71danRNGrtKXE0iA&usqp=CAU',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjrswnIK2RACt05tzlskU4UreybspYoPOMlUtxj25r5QGTy7cGQHe7ttt84DJjzdfJQ_k&usqp=CAU',
  'https://www.shutterstock.com/image-vector/barcode-on-white-background-vector-600nw-1490283347.jpg',
  'https://img.freepik.com/free-vector/illustration-barcode_53876-44019.jpg?w=740&t=st=1703092021~exp=1703092621~hmac=7cb32e196f05276f8b3b60cb05acb879dbf1798435a902fba857b7aa2aa7d41e',
  'https://img.freepik.com/free-psd/barcode-illustration-isolated_23-2150584094.jpg?w=996&t=st=1703092079~exp=1703092679~hmac=b1e19110351d288f26c5b5f3b7e3f142892ee32964f28df5aa5df31806b1abb1',
  'https://img.freepik.com/free-psd/barcode-illustration-isolated_23-2150584084.jpg?w=996&t=st=1703092117~exp=1703092717~hmac=6974104aec637c51c694ee2d20b53aa602e338e3c82ef68aba037bd59537eff9',
  'https://img.freepik.com/free-psd/barcode-illustration-isolated_23-2150584096.jpg?w=996&t=st=1703092142~exp=1703092742~hmac=1e02582bf54f43593e0811548c677d188e5c072b906ad354316f6b1c4e0537fe',
  'https://as2.ftcdn.net/v2/jpg/03/08/94/29/1000_F_308942902_gsTvi3kRqHua4Ot8cOSse6ox7JkipPRM.jpg'

]
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
              }
            }
          }
        }
      }
    }
  }
`;
app.get('/products/add', (req, res) => {
  res.render('products/addProduct');
});
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

// app.get('/', (req, res) => {
//   res.render('products/all');
// });

// app.get('/', (req, res) => {
//   res.render('products/addProduct');
// });

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

app.post('/addDataToShopify', async (req, res) => {
  try {
    const { title, description, price, inventoryQuantity } = req.body;
    const barcodeBuffer = await generateBarcode(title);
    to++;
    const graphqlVariables = {
      input: {
        title: title,
        descriptionHtml: description,
        variants: [
          {
            price: price
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
    res.json({ data: data.data, barcode: barcodeBuffer.toString('base64') });
  } catch (error) {
    handleError(res, error);
  }
});
app.get('/show/:productId', async (req, res) => {
  try {
    const response = await axios.post(graphqlUrl, { query: graphqlQuery }, graphqlConfig);
    const data = response.data;
    const desiredProductId = req.params.productId;

    const products = data.data.products.edges.map(edge => edge.node);

    // Find the product that matches the desiredProductId
    const desiredProduct = products.find(product => product.title === desiredProductId);

    if (desiredProduct) {
       console.log(desiredProduct);
       const randomNumber = Math.floor(Math.random() * 9);
       url=images[randomNumber];
       url2=brcodes[randomNumber];
      // If the product is found, send it in the response
      res.render('products/show', { product:desiredProduct,url, url2 });
    } else {
      // If the product is not found, you might want to handle this case
      res.send('Product not found');
    }
  } catch (error) {
    handleError(res, error);
  }
});


app.get('/', async (req, res) => {
  try {
    const response = await axios.post(graphqlUrl, { query: graphqlQuery }, graphqlConfig);
    const data = response.data;
    const products = data.data.products.edges.map(edge => edge.node);
    for (const product of products) {
      const { barcodeFileName, text } = await generateBarcode(product.title);
      product.barcodeFileName = barcodeFileName;
      product.imageSrc = `/images/products/${product.id}.png`;
    }
    console.log(products[0].variants.edges);
    res.render('products/allProducts', { products,brcodes , images , to , co , po});
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

        const barcodeFileName = path.join(__dirname, 'views', 'products', `barcode_${text}.png`);
        fs.writeFileSync(barcodeFileName, png);
        console.log("File Name: ",barcodeFileName);
        resolve({barcodeFileName,text});
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
