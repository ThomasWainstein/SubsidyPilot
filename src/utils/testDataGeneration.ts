// Test data generation utilities for Phase B testing
export const generateTestCSV = (): string => {
  const csvData = `title,description,amount,region,funding_type,deadline,url
"Digital Agriculture Innovation","Support for digital farming technologies",50000,"Bucharest",public,"2024-12-31","https://example.com/digital-ag"
"Organic Farming Transition","Financial aid for organic certification",25000,"Cluj",public,"2024-11-30","https://example.com/organic"
"Young Farmer Startup","Grants for farmers under 35",75000,"Timis",mixed,"2024-10-15","https://example.com/young-farmer"`;
  
  return csvData;
};

export const generateTestJSON = (): string => {
  const jsonData = [
    {
      title: "Renewable Energy for Farms",
      description: "Solar and wind energy installations",
      amount: 100000,
      region: ["Alba", "Arad"],
      funding_type: "public",
      deadline: "2024-12-15",
      url: "https://example.com/renewable"
    },
    {
      title: "Livestock Modernization",
      description: "Equipment for livestock management",
      amount: 60000,
      region: ["Brasov"],
      funding_type: "mixed",
      deadline: "2024-11-20",
      url: "https://example.com/livestock"
    }
  ];
  
  return JSON.stringify(jsonData, null, 2);
};