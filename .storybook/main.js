module.exports = {
  stories: ['../src/**/*.stories.tsx'],
  webpackFinal: async config => {
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      use: [
        {
          loader: require.resolve('ts-loader'),
        },
      ],
    });
    config.module.rules.push({
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader',
      ]
    });
    config.module.rules.push({
      test: /\.less$/,
      use: [
        'style-loader',
        'css-loader',
        {
          loader: 'less-loader',
          options: {
            lessOptions: {
              javascriptEnabled: true
            }
          }
        }
      ]
    });
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|svg)$/,
      use: 'url-loader'
    })

    config.resolve.extensions.push('.ts', '.tsx');

    return config
  },
}
