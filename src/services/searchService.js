const Track = require('../models/Track');
const Album = require('../models/Album');
const Artist = require('../models/Artist');
const Playlist = require('../models/Playlist');
const AutoCompleteService = require('./autoComplete');
const logger = require('../utils/logger');

class SearchService {
  static buildSearchQuery(keywords) {
    return {
      $or: [
        { phoneticCode: { $in: keywords.map(word => require('phonetics').metaphone(word)) } },
        { 
          $or: keywords.map(keyword => ({
            $or: [
              { name: { $regex: keyword, $options: 'i' } },
              { title: { $regex: keyword, $options: 'i' } }
            ]
          }))
        }
      ]
    };
  }

  static async globalSearch(q, type = 'all', limit = 10) {
    const keywords = q.toLowerCase().split(/\s+/);
    const searchQuery = this.buildSearchQuery(keywords);
    const results = {};

    // Record search for autocomplete
    await AutoCompleteService.addToSearchHistory('general', q);

    if (type === 'all' || type === 'tracks') {
      results.tracks = await Track.find(searchQuery)
        .populate('artist', 'name images')
        .populate('album', 'title images')
        .limit(parseInt(limit))
        .select('title duration audioUrl images');
    }

    if (type === 'all' || type === 'albums') {
      results.albums = await Album.find(searchQuery)
        .populate('artist', 'name')
        .limit(parseInt(limit))
        .select('title releaseDate images');
    }

    if (type === 'all' || type === 'artists') {
      results.artists = await Artist.find(searchQuery)
        .limit(parseInt(limit))
        .select('name genre images popularity');
    }

    if (type === 'all' || type === 'playlists') {
      results.playlists = await Playlist.find({
        name: { $regex: q, $options: 'i' }
      })
        .limit(parseInt(limit))
        .select('name description images');
    }

    return this.formatSearchResults(results);
  }

  static formatSearchResults(results) {
    return {
      tracks: results.tracks?.map(track => ({
        id: track._id,
        title: track.title,
        duration: track.duration,
        audioUrl: track.audioUrl,
        image: track.images?.medium || track.album?.images?.medium,
        artist: track.artist?.name,
        album: track.album?.title
      })) || [],
      
      artists: results.artists?.map(artist => ({
        id: artist._id,
        name: artist.name,
        genre: artist.genre,
        image: artist.images?.medium,
        popularity: artist.popularity
      })) || [],
      
      albums: results.albums?.map(album => ({
        id: album._id,
        title: album.title,
        image: album.images?.medium,
        artist: album.artist?.name,
        releaseDate: album.releaseDate
      })) || [],
      
      playlists: results.playlists?.map(playlist => ({
        id: playlist._id,
        name: playlist.name,
        description: playlist.description,
        image: playlist.images?.medium
      })) || []
    };
  }

  static async searchTracks(query) {
    const { 
      q, 
      genre, 
      minDuration, 
      maxDuration,
      minYear,
      maxYear,
      minPopularity,
      sort = 'popularity',
      order = 'desc',
      limit = 10,
      offset = 0
    } = query;

    let searchQuery = {};
    
    if (q) {
      searchQuery = this.buildSearchQuery(q.toLowerCase().split(/\s+/));
    }

    if (genre) searchQuery.genre = genre;
    if (minDuration || maxDuration) {
      searchQuery.duration = {};
      if (minDuration) searchQuery.duration.$gte = parseInt(minDuration);
      if (maxDuration) searchQuery.duration.$lte = parseInt(maxDuration);
    }
    if (minYear || maxYear) {
      searchQuery.releaseDate = {};
      if (minYear) searchQuery.releaseDate.$gte = new Date(minYear, 0, 1);
      if (maxYear) searchQuery.releaseDate.$lte = new Date(maxYear, 11, 31);
    }
    if (minPopularity) {
      searchQuery.popularity = { $gte: parseInt(minPopularity) };
    }

    const sortQuery = this.buildSortQuery(sort, order);

    return await Track.find(searchQuery)
      .sort(sortQuery)
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate('artist album');
  }

  static buildSortQuery(sort, order) {
    const sortOrder = order === 'desc' ? -1 : 1;
    switch (sort) {
      case 'title': return { title: sortOrder };
      case 'duration': return { duration: sortOrder };
      case 'releaseDate': return { releaseDate: sortOrder };
      case 'popularity':
      default: return { popularity: sortOrder };
    }
  }
}

module.exports = SearchService; 