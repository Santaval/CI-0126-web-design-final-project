export default class StatsService {
  static async all() {
    return [
      {
        name: "Victories",
        value: 42,
      },
      {
        name: "Losses",
        value: 128,
      },
      {
        name: "Games Played",
        value: 170,
      },
      {
        name: "Destroyed Ships",
        value: 350,
      }
    ];
  }
}
