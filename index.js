const fetchData = async() => {
  const puppeteer = require("puppeteer")
  const URL = "https://banner9-registration.kfupm.edu.sa/StudentRegistrationSsb/ssb/term/termSelection?mode=search"

  const buildingCollection = []
  const sectionCollection = []

  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({headless: false}); // add {headless: false} to view the browser
  const page = await browser.newPage();

  // Navigate the page to the URL
  await page.goto(URL,{
    waitUntil:"load"
  });
  
  // Selecting a Term
  const inputElement = await page.$('#txt_term')
  await page.evaluate((element) => {
    element.setAttribute('listofsearchterms', '202320');
  }, inputElement);

  // Clicking Continue
  await page.click("#term-go");

  // Wait for the Search button to appear
  await page.waitForSelector("#search-go");

  // Clicking Search
  await page.click("#search-go");
 
  // Gathering Data

  await page.waitForSelector('#table1 tbody'); // Waiting for the table to appear
  const tbodyElement = await page.$('#table1 tbody');   // This is the <tbody>
  

  // displaying 50 records in each page
  await page.select('select.page-size-select', "50");

  /// Looping over rows and pages
  
  let isEnable = true;
  while(isEnable){
    const trElements = await tbodyElement.$$('tr'); // These are all rows
    for (const tr of trElements) {
      const tdElement = await tr.$('td[data-property="meetingTime"]'); // Select the td element with data-property="meetingTime"
      
      //To solve the problem of the title
      // Move the mouse away from the element
      await page.mouse.move(0, 0);
      // Wait for a short period to allow the hover effect to be removed
      await new Promise(resolve => setTimeout(resolve, 50));

      
      if (tdElement) {
        const data = await tdElement.evaluate(element => element.getAttribute('title'));
        if(!data.includes("None")){ //&& !data.includes("Gym") && !data.includes("(Sport Complex)")
          // adding buildings and rooms
          addBuildingsAndRooms(buildingCollection, data)

          //adding sections
          addSections(sectionCollection, data)
        }
      }      
    }
    //Clicking next to go to the next page
    await page.evaluate(() => {
      const nextButton = document.querySelector('.next.enabled');
      isEnable = nextButton !== null
      console.log(nextButton + " " + isEnable)
      if(isEnable){
        nextButton.click()
      }
    });
  }
  // Closing Browser
  await browser.close(); 

  return [buildingCollection, sectionCollection]
}

function addDays(s){
  let result = []
  if(s.includes("Sunday")){
    result.push("U")
  }
  if(s.includes("Monday")){
        result.push("M")
  }
  if(s.includes("Tuesday")){
        result.push("T")
  }
  if(s.includes("Wednesday")){
        result.push("W")
  }
  if(s.includes("Thursday")){
        result.push("R")
  }
  return result
}

function addSections(sectionCollection, data){

  const days= addDays(data)
  const building = data.substring(data.indexOf("#") + 1, data.indexOf(" Room"))
  const room = data.substring(data.indexOf("Room: ") + 6, data.indexOf(" Start"))
  const startTime = formatTime(data.substring(data.indexOf("SMTWTFS") + 7, data.indexOf(" -")))
  const endTime = formatTime(data.substring(data.indexOf("-") + 2 , data.indexOf(" Type")))

  sectionCollection.push({
    days: days,
    buildingNumber: building,
    roomNumber: room,
    startTime: startTime,
    endTime: endTime
  })
}

function addBuildingsAndRooms(buildingCollection, data) {

  const buildingNumber = data.substring(data.indexOf("#") + 1, data.indexOf(" Room"))
  const roomNumber = data.substring(data.indexOf("Room: ") + 6, data.indexOf(" Start"))

  // Check if the building already exists in the collection
  const existingBuilding = buildingCollection.find(
    (building) => building.buildingNumber === buildingNumber
  );

  if (existingBuilding) {
    // Check if the room is already added to the existing building
    if (!existingBuilding.rooms.includes(roomNumber)) {
      // Add the room to the existing building
      existingBuilding.rooms.push(roomNumber);
    }
  } else {
    // Create a new building object and add it to the collection
    const newBuilding = { buildingNumber, rooms: [roomNumber] };
    buildingCollection.push(newBuilding);
  }
}

function formatTime(time){
  let hours = parseInt(time.substr(0,2))
  let minutes = parseInt(time.substr(time.indexOf(":") + 1, 2))

  if (hours === 12) {
    hours = (time.includes("AM")) ? 0 : 12;
  } else {
    hours += (time.includes("PM")) ? 12 : 0;
  }  

  const date = new Date()
  date.setHours(hours, minutes, 0)

  return date
}

function saveToJsonFile(filename, data){
  console.log("start saving")
  const fs = require('fs');

  // Convert the JavaScript object to a JSON string
  const jsonString = JSON.stringify(data);

  // Write the JSON string to a file
  fs.writeFile(filename + '.json', jsonString, 'utf8', (err) => {
    if (err) {
      console.error('Error writing JSON file:', err);
      return;
    }
    console.log('JSON file has been saved successfully.');
  });
}

(async () => {
  try {
    const [buildingCollection, sectionCollection] = await fetchData();

    console.log("finish fetching")
    saveToJsonFile("buildings", buildingCollection)
    saveToJsonFile("sections", sectionCollection)

  } catch (error) {
    console.error(error);
  }
})();









