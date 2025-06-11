const {Builder, Browser, By, Key, until} = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const fs = require("fs");

(async ()=>{    
    let day = new Date().getDate()
    const month = new Date().getUTCMonth()
    const year = new Date().getFullYear()
    const formatedDate = day < 10? `date_0${day}${month+1}${year}` : `date_${day}${month+1}${year}`;
    const flightsData = [];
    var count = 0;

    let options = new firefox.Options();

    options.setPreference('dom.webnotifications.enabled', false);
    options.setPreference('permissions.default.geo', 2);


    let driver = await new Builder()
        .forBrowser(Browser.FIREFOX)
        .setFirefoxOptions(options)
        .build();

    await driver.get('https://www.smiles.com.br/home');
    
    await driver.manage().window().maximize();

    await new Promise((r)=> setTimeout(r, 5000));
    acceptCookie = await driver.wait(until.elementLocated(By.id("onetrust-accept-btn-handler")), 10000);
    await driver.wait(until.elementIsVisible(acceptCookie),5000);
    await driver.wait(until.elementIsEnabled(acceptCookie),5000);
    await acceptCookie.click();

    origem = await driver.findElement(By.id("inp_flightOrigin_1"))
    await driver.wait(until.elementIsEnabled(origem),5000);
    origem.click();
    origem.sendKeys("Guarulhos");
    
    const guarulhosOption = await driver.wait(until.elementLocated(By.xpath("//p[contains(text(),'Guarulhos')]")), 10000);
    await guarulhosOption.click();

    const destino = await driver.findElement(By.id("inp_flightDestination_1"))
    await driver.wait(until.elementIsEnabled(destino),5000);
    destino.click();
    destino.sendKeys("Miami");

    const miamiOption = await driver.wait(until.elementLocated(By.xpath("//p[contains(text(),'MIA')]")), 10000);
    await miamiOption.click();

    await driver.findElement(By.id("drop_fligthType")).click();

    await driver.findElement(By.id("opt_oneWay")).click();
    
    await driver.findElement(By.id("startDateId")).click();

    await driver.wait(until.elementLocated(By.id(formatedDate))).click();

    await driver.findElement(By.id("btn_search")).click();
    
    try{
        await driver.wait(until.elementLocated(By.css(".smls-flight-search-default-modal.modal.fade.show.redesign.backdrop.trap")), 5000).click();       
        btnSameDay = await driver.wait(until.elementLocated(By.id("btn_sameDayInternational")), 5000);
        await driver.wait(until.elementIsVisible(btnSameDay),5000);
        btnSameDay.click();
    
        
    }catch(error){
        console.log("Viagem não é no mesmo dia")
    }
    
    while (count <= 10){
        console.log("Esperando carregamento da pagina de voos...")      
        //verifica se página de voos ainda esta carregando
        while(true){
            try{
        await driver.wait(until.elementLocated(By.className("skeleton-container")),15000);
        }catch(error){
            console.log("página carregada");
            break;
        }  
        }
        

        //verifica se tem voos disponiveis na página
        try{
            const noFlightsElement = await driver.wait(
            until.elementLocated(By.className("select-flight-not-found-card")),
            10000
            );
            await driver.wait(until.elementIsVisible(noFlightsElement), 5000); 
            console.log("sem voos disponiveis neste dia");
            count ++;
            await passDay(driver);
            continue;
            
        }catch(error){
            console.log("Voo disponível");
        }

        while(true){
            try{
                const moreFlights = await driver.wait(until.elementLocated(By.id('SelectFlightList-ida-more')), 10000);
                moreFlights.click();
                break;
            }catch(error){
                console.log("botão não encontrado");
                break;
            }
            
        }

        const flights = await driver.findElements(By.css('div[data-testid="openAccordion"]'))

        const data = await driver.executeScript(function (...flights) {
            return flights.map(flight => {

                const empresa  = flight.querySelector('.company').innerText 
                const classe = flight.querySelector('.seat').innerText
                const valor = flight.querySelector('.miles').innerText
                const duracao = flight.querySelector('.scale-duration__time').innerText
                const horarios = Array.from(flight.querySelectorAll('.iata-code')).map(e => e.innerText);
                const saida = horarios.find(horario => horario.includes('GRU')) || null;
                const chegada = horarios.find(horario => horario.includes('MIA')) || null;

                return { empresa, classe, valor, duracao, saida, chegada };
            });
        }, ...flights);

        flightsData.push("Página"+count,...data);
        count ++;
        await passDay(driver);
    }
    

    fs.writeFileSync("voos_data.json", JSON.stringify(flightsData, null, 2), "utf-8");

})();

//remove a data em milissegundos da url e adiciona um dia
const passDay = async (driver)=>{

    let nextDay = 86400000;
    let urlFLigthPage = await driver.getCurrentUrl();
    let objectUrl = new URL(urlFLigthPage);
    let departureDate = objectUrl.searchParams.get("departureDate");
    const date = parseInt(departureDate) + nextDay;
    await driver.get(`https://www.smiles.com.br/mfe/emissao-passagem/?adults=1&cabin=ALL&children=0&departureDate=${date}&infants=0&isElegible=false&isFlexibleDateChecked=false&returnDate=&searchType=g3&segments=1&tripType=2&originAirport=GRU&originCity=&originCountry=&originAirportIsAny=false&destinationAirport=MIA&destinCity=&destinCountry=&destinAirportIsAny=false&novo-resultado-voos=true`);
    

}