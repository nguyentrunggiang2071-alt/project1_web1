Handlebars.registerHelper("formatDate", function (date) {
  let options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZoneName: "short",
  };
  let formatDate = new Date(date);
  return formatDate.toLocaleString("en-US", options);
});
