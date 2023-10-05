import puppeteer from 'puppeteer';
import fs from 'fs';

const getLinksProd = async () =>{
    //De donde vamos a tomar la informacion:
    let urlToParse = "https://listado.mercadolibre.com.ar/microondas#D[A:microondas]";
        
        //Levantamos el navegador (puppeter):
        //Con headless: false, ejecuta el navegador visualmente.
        // const options = { 
        //     headless: false,
        //     defaultViewport: null
        //  };
        
        const browser = await puppeteer.launch();
        
            //Pestana inicial vacia: (_blank):
        const page = await browser.newPage();

        //Redireccionamos hacia donde queremos:
        await page.goto(urlToParse);

        const getLinks = page.evaluate(()=>{
            const getLink = (publicacion) =>{
                const pub = publicacion.getElementsByClassName("ui-search-link")[0].href;
                console.log(pub);
                return pub
            };
            
            const todasLasPublicaciones = document.getElementsByClassName('ui-search-layout__item');
            
            return Array.from(todasLasPublicaciones).map((publicacion) => getLink(publicacion));
        });

        const links = await getLinks;

        //Retorna un array con los links de 48 productos, correspondiente a la pagina de ML
        return links;
};  


const getLinkData = async (link) =>{
    
    //Levantamos el navegador (puppeter):
    //Con headless: false, ejecuta el navegador visualmente.
    // const options = { headless: false };
    
    const browser = await puppeteer.launch();
    
        //Pestana inicial vacia: (_blank):
    const page = await browser.newPage();

            //Configuramos elviewPort:
    await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
    });

    //Redireccionamos hacia donde queremos:
    await page.goto(link);

    const data = await page.evaluate(()=>{
        return __PRELOADED_STATE__.initialState;
    });

    const getAttributes = async (data) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            const att1 = data.components?.highlighted_specs_attrs?.components;
            const att2 = data.components?.highlighted_specs_attrs_swap?.components;
      
            if (att1) {
              resolve(att1);
            } else {
              resolve(att2);
            }
          }, 2000);
        });
      };

      const getGallery = async (data) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            const picturesIDS = data.components.gallery.pictures; //Array
            const picture_configURLS = data.components.gallery.picture_config; //Obj

            const urlsActualizadas = {};
            for (const [clave, plantilla] of Object.entries(picture_configURLS)) {
            urlsActualizadas[clave] = picturesIDS.map(picture => plantilla.replace(/{id}/g, picture.id));
            }

            return resolve(urlsActualizadas);

          }, 3000);
        });
      };




    const reviewsInfo = {
        rating: data.components.header?.reviews,
        reviews: data.schema[0]?.review,
    }

   const productData = {
        title: data.schema[0].name,
        category: data.components.breadcrumb?.categories.map( cat => cat.label.text),
        price: data.components.price.price?.original_value,
        discount: data.components.price.discount_label,
        // stock: parseInt(data.components.available_quantity?.picker.description.match(/\d+/)[0], 10),
        stock: data.components.available_quantity?.picker.description,
        description: data.schema[0]?.description, 
        attributes: await getAttributes(data),
        reviewsInfo,
        offer_price: data.components.price.price?.value,
        image: data.schema[0].image,
        gallery: await getGallery(data)
   }

   //Retorna la informacion de un producto en particular que le pasamos por parametro
   return productData;
};  

// function getNumberPage(nroPagina) {
//     const desde = `_Desde_${48 * (nroPagina -1) +1}`;
//     return `https://listado.mercadolibre.com.ar/almacen${desde}_NoIndex_True`
// };


(async ()=>{
    console.log('Inicio')

    const links = await getLinksProd();
    for( let index =0; index < links.length; index++ ){
        console.log(`Producto nro: ${index}`)
        console.log(`Link: ${links[index]}`)
        
        let rawdata = await fs.promises.readFile( './microondas.json', 'utf-8');
        let data = JSON.parse(rawdata, null, "\n")


        const prodData = await getLinkData(links[index]);
        data.push(prodData)
        console.log(prodData);

        let prodtoArray = data;

        await fs.promises.writeFile('./microondas.json', JSON.stringify(prodtoArray, null, '\t'))
            .then(()=> {return console.log(`Se agrego ${prodData.title} sin problemas`)})
            .catch(err => console.log(err))   
    }
    console.log("Proceso Finalizado!")
})()

