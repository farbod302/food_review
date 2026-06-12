const axios = require('axios');

const getUserFoods = async (user_id, date) => {
    try {
        const response = await axios.get(`https://backend.nutrosal.com/getReportsForDay/${user_id}/${date}`, {
            headers: {
                'Authorization': `"${process.env.NUTROSAL_TOKEN}"`
            }
        });
        if (!response.data) return [];
        const foods_image = response.data.filter(food => food.img).map(food => food.path);
        return foods_image;
    } catch (error) {
        console.log(error);
        return [];
    }
};

module.exports = getUserFoods;