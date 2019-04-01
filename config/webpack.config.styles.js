const autoprefixer = require('autoprefixer')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const PostCSSAssetsPlugin = require('postcss-assets-webpack-plugin')
const sortCSSmq = require('sort-css-media-queries')
const { SRC_DIR } = require('./webpack.vars')

module.exports = env => ({
  module: {
    rules: [
      {
        include: SRC_DIR,
        test: /\.styl$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          }, {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
              modules: true,
              sourceMap: true,
              localIdentName: '[name]_[local]_[hash:base64:5]'
            }
          }, {
            loader: 'stylus-loader',
            options: {
              sourceMap: true,
              preferPathResolver: 'webpack'
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: `app${env.production ? '.[hash].min' : ''}.css`
    }),
    // new PostCSSAssetsPlugin({
    //   test: /\.css$/,
    //   plugins: [
    //     require('css-mqpacker')({sort: sortCSSmq}),
    //     require('postcss-discard-duplicates'),
    //     require('postcss-discard-empty')
    //   ].concat(
    //     production
    //       ? require('csswring')({
    //           preservehacks: true,
    //           removeallcomments: true
    //         })
    //       : []
    //   )
    // })
  ]
})
