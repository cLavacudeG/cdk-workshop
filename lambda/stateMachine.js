exports.submitHandler = async (event) => {
  console.log(event);
  return event;
};

exports.stateHandler = async (event) => {
  console.log(event);
  return "SUCCEEDED";
};
