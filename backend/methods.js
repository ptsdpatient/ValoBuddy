import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';

dotenv.config();

const key = process.env.KEY


export async function lastmatch(region, name, tag) {
  const url = `https://api.henrikdev.xyz/valorant/v1/mmr-history/${region || 'ap'}/${name}/${tag}`;

  try {
    const res = await axios.get(url, {
      headers: {
        Authorization: key
      }
    });

    if (!res.data.data || res.data.data.length === 0) {
      return { error: 'No match history found.' };
    }

    const matchResponse = await axios.get(`https://api.henrikdev.xyz/valorant/v2/match/${res.data.data[0].match_id}`,{
      headers: {
        Authorization: key
      }
    })



    return {
      matchData:res.data.data[0],
      leaderBoard:matchResponse.data
    };

  } catch (err) {
    return {
      error: err.response?.data || err.message,
      status: err.response?.status || 500,
    };
  }
}

export async function info(region, name, tag) {
  const url = `https://api.henrikdev.xyz/valorant/v1/mmr/${region || 'ap'}/${name}/${tag}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: key
      }
    });

    // console.log(JSON.stringify(response.data.data))

    return response.data;
  } catch (err) {
    return {
      error: err.response?.data || err.message,
      status: err.response?.status || 500
    };
  }
}
