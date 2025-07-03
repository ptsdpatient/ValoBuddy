import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const key = process.env.KEY


export async function latestMatch(region, name, tag) {
  const url = `https://api.henrikdev.xyz/valorant/v1/mmr-history/${region || 'ap'}/${name}/${tag}`;

  try {
    const res = await axios.get(url, {
      headers: {
        Authorization: process.env.KEY
      }
    });

    if (!res.data.data || res.data.data.length === 0) {
      return { error: 'No match history found.' };
    }

    const match = res.data.data[0];

    return {
      map: match.map,
      rank: match.currenttierpatched,
      elo: match.elo,
      mmr_change: match.mmr_change_to_last_game,
      date: match.date,
      season: match.season,
    };
  } catch (err) {
    return {
      error: err.response?.data || err.message,
      status: err.response?.status || 500,
    };
  }
}

export async function mmr(region, name, tag) {
  const url = `https://api.henrikdev.xyz/valorant/v1/mmr/${region || 'ap'}/${name}/${tag}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: key
      }
    });

    return response.data;
  } catch (err) {
    return {
      error: err.response?.data || err.message,
      status: err.response?.status || 500
    };
  }
}
